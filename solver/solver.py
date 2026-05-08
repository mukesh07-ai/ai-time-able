from ortools.sat.python import cp_model
import time
import math


class TimetableSolver:
    def __init__(self, config_dict):
        self.config = config_dict
        self.working_days = config_dict.get('working_days', 5)
        self.slots_per_day = config_dict.get('slots_per_day', 8)
        self.lunch_slot = config_dict.get('lunch_slot', 4)
        self.teachers = config_dict.get('teachers', [])
        self.subjects = config_dict.get('subjects', [])
        self.rooms = config_dict.get('rooms', [])
        self.model = cp_model.CpModel()

    def solve(self):
        start_time = time.time()

        # Build lookup maps
        teacher_map = {t['id']: t for t in self.teachers}
        subject_map = {s['id']: s for s in self.subjects}
        room_map = {r['id']: r for r in self.rooms}

        # Build unavailable slot sets per teacher
        teacher_unavailable = {}
        for t in self.teachers:
            teacher_unavailable[t['id']] = set(
                tuple(sl) for sl in t.get('unavailable_slots', [])
            )

        # ── Create decision variables ──────────────────────────────────────────
        # vars[(teacher_id, subject_id, room_id, day, slot)] = BoolVar
        vars = {}

        for subject in self.subjects:
            s_id = subject['id']
            requires_lab = subject.get('requires_lab', False)
            student_group = subject.get('student_group', 'Default')

            # Find teachers who can teach this subject
            teachers_for_s = [
                t for t in self.teachers
                if s_id in t.get('subject_ids', [])
            ]
            if not teachers_for_s:
                # Fallback: assign any active teacher
                teachers_for_s = self.teachers[:1] if self.teachers else []

            # Find eligible rooms
            dedicated_room = subject.get('dedicated_room_id')
            if requires_lab:
                rooms_for_s = [r for r in self.rooms if r.get('is_lab', False)]
                if not rooms_for_s:
                    rooms_for_s = self.rooms
            elif dedicated_room:
                # If a dedicated room is set, prioritize it (or force it)
                rooms_for_s = [r for r in self.rooms if r['id'] == dedicated_room]
                if not rooms_for_s:
                    rooms_for_s = self.rooms
            else:
                rooms_for_s = self.rooms

            for teacher in teachers_for_s:
                t_id = teacher['id']
                for room in rooms_for_s:
                    r_id = room['id']
                    for day in range(self.working_days):
                        for slot in range(self.slots_per_day):
                            # Skip lunch slot
                            if slot == self.lunch_slot:
                                continue
                            # Skip teacher unavailable slots
                            if (day, slot) in teacher_unavailable.get(t_id, set()):
                                continue

                            key = (t_id, s_id, r_id, day, slot)
                            var_name = f'v_{t_id[:6]}_{s_id[:6]}_{r_id[:6]}_{day}_{slot}'
                            vars[key] = self.model.NewBoolVar(var_name)

        if not vars:
            return {
                "status": "INFEASIBLE",
                "entries": [],
                "violations": [{"type": "no_variables", "message": "No valid combinations found. Check teacher-subject assignments."}],
                "stats": {"variables": 0, "time_ms": 0}
            }

        # ── Hard Constraints ───────────────────────────────────────────────────

        # H1: Teacher conflict — teacher can only teach one class at a time
        for teacher in self.teachers:
            t_id = teacher['id']
            for day in range(self.working_days):
                for slot in range(self.slots_per_day):
                    if slot == self.lunch_slot:
                        continue
                    slot_vars = [
                        var for (tid, sid, rid, d, s), var in vars.items()
                        if tid == t_id and d == day and s == slot
                    ]
                    if len(slot_vars) > 1:
                        self.model.Add(sum(slot_vars) <= 1)

        # H2: Room conflict — one class per room per slot
        for room in self.rooms:
            r_id = room['id']
            for day in range(self.working_days):
                for slot in range(self.slots_per_day):
                    if slot == self.lunch_slot:
                        continue
                    slot_vars = [
                        var for (tid, sid, rid, d, s), var in vars.items()
                        if rid == r_id and d == day and s == slot
                    ]
                    if len(slot_vars) > 1:
                        self.model.Add(sum(slot_vars) <= 1)

        # H3: Student group conflict — one subject per group per slot
        groups = list(set(s.get('student_group', 'Default') for s in self.subjects))
        subject_group_map = {s['id']: s.get('student_group', 'Default') for s in self.subjects}

        for group in groups:
            group_subject_ids = [s['id'] for s in self.subjects if s.get('student_group', 'Default') == group]
            for day in range(self.working_days):
                for slot in range(self.slots_per_day):
                    if slot == self.lunch_slot:
                        continue
                    slot_vars = [
                        var for (tid, sid, rid, d, s), var in vars.items()
                        if sid in group_subject_ids and d == day and s == slot
                    ]
                    if len(slot_vars) > 1:
                        self.model.Add(sum(slot_vars) <= 1)

        # H4: Subject frequency — each subject must appear exactly periods_per_week times
        for subject in self.subjects:
            s_id = subject['id']
            periods = subject.get('periods_per_week', 4)
            subject_vars = [var for (tid, sid, rid, d, s), var in vars.items() if sid == s_id]
            if subject_vars:
                self.model.Add(sum(subject_vars) == periods)

        # ── Soft Constraints (minimize penalties) ─────────────────────────────
        penalty_terms = []

        # S1: Compactness & Early Bias — push classes to early slots and early days
        # This naturally leaves evenings and weekends vacant as requested.
        for (t_id, s_id, r_id, day, slot), var in vars.items():
            # Penalty increases with slot number and day number.
            # slot weight: 1, day weight: 5 (prioritize early day more)
            penalty_terms.append(var * (slot + day * 5))

        # H6: Subject daily limit — ensure a subject appears at most once per day per group
        # This prevents the solver from bunching classes on a single day.
        for subject in self.subjects:
            s_id = subject['id']
            periods = subject.get('periods_per_week', 4)
            
            # Calculate the strict minimum slots needed per day.
            # Usually 1, but if credits > working_days, we allow the necessary minimum.
            # We apply this to ALL subjects (theory and lab) to ensure spreading.
            limit = math.ceil(periods / self.working_days) if self.working_days > 0 else 1
            
            for day in range(self.working_days):
                # Gather all potential teacher/room variables for this subject on this day
                day_subject_vars = [
                    var for (tid, sid, rid, d, s), var in vars.items() 
                    if sid == s_id and d == day
                ]
                if day_subject_vars:
                    # sum of all possible slots for this subject on this day must be <= limit
                    self.model.Add(sum(day_subject_vars) <= limit)
                    
                    # Soft constraint: Prefer even less if possible
                    if limit > 1:
                        penalty_vars = self.model.NewBoolVar(f'pen_{s_id[:4]}_{day}')
                        self.model.Add(sum(day_subject_vars) <= 1).OnlyEnforceIf(penalty_vars.Not())
                        penalty_terms.append(penalty_vars)

        # H5: Teacher max daily load
        for teacher in self.teachers:
            t_id = teacher['id']
            max_daily = teacher.get('max_periods_per_day', 6)
            for day in range(self.working_days):
                day_vars = [
                    var for (tid, sid, rid, d, s), var in vars.items()
                    if tid == t_id and d == day
                ]
                if day_vars:
                    self.model.Add(sum(day_vars) <= max_daily)

        # ── S2: Minimize "window" periods (free slots between busy slots) ─────────────────────────────
        
        # Teacher Windows
        for teacher in self.teachers:
            t_id = teacher['id']
            for day in range(self.working_days):
                for s in range(self.slots_per_day - 2):
                    if s == self.lunch_slot or s + 1 == self.lunch_slot or s + 2 == self.lunch_slot:
                        continue

                    vars_at_s = [var for (tid, sid, rid, d, sl), var in vars.items() if tid == t_id and d == day and sl == s]
                    vars_at_s2 = [var for (tid, sid, rid, d, sl), var in vars.items() if tid == t_id and d == day and sl == s + 2]
                    vars_at_s1 = [var for (tid, sid, rid, d, sl), var in vars.items() if tid == t_id and d == day and sl == s + 1]

                    if vars_at_s and vars_at_s2 and vars_at_s1:
                        busy_s = self.model.NewBoolVar(f't_busy_{t_id[:4]}_{day}_{s}')
                        busy_s2 = self.model.NewBoolVar(f't_busy_{t_id[:4]}_{day}_{s+2}')
                        free_s1 = self.model.NewBoolVar(f't_free_{t_id[:4]}_{day}_{s+1}')
                        window = self.model.NewBoolVar(f't_win_{t_id[:4]}_{day}_{s}')

                        self.model.Add(sum(vars_at_s) >= 1).OnlyEnforceIf(busy_s)
                        self.model.Add(sum(vars_at_s) == 0).OnlyEnforceIf(busy_s.Not())
                        self.model.Add(sum(vars_at_s2) >= 1).OnlyEnforceIf(busy_s2)
                        self.model.Add(sum(vars_at_s2) == 0).OnlyEnforceIf(busy_s2.Not())
                        self.model.Add(sum(vars_at_s1) == 0).OnlyEnforceIf(free_s1)
                        self.model.Add(sum(vars_at_s1) >= 1).OnlyEnforceIf(free_s1.Not())

                        self.model.AddBoolAnd([busy_s, busy_s2, free_s1]).OnlyEnforceIf(window)
                        penalty_terms.append(window * 20)

        # Student Group Windows
        for group in groups:
            group_subject_ids = [s['id'] for s in self.subjects if s.get('student_group', 'Default') == group]
            for day in range(self.working_days):
                for s in range(self.slots_per_day - 2):
                    if s == self.lunch_slot or s + 1 == self.lunch_slot or s + 2 == self.lunch_slot:
                        continue

                    vars_at_s = [var for (tid, sid, rid, d, sl), var in vars.items() if sid in group_subject_ids and d == day and sl == s]
                    vars_at_s2 = [var for (tid, sid, rid, d, sl), var in vars.items() if sid in group_subject_ids and d == day and sl == s + 2]
                    vars_at_s1 = [var for (tid, sid, rid, d, sl), var in vars.items() if sid in group_subject_ids and d == day and sl == s + 1]

                    if vars_at_s and vars_at_s2 and vars_at_s1:
                        busy_s = self.model.NewBoolVar(f'g_busy_{group[:4]}_{day}_{s}')
                        busy_s2 = self.model.NewBoolVar(f'g_busy_{group[:4]}_{day}_{s+2}')
                        free_s1 = self.model.NewBoolVar(f'g_free_{group[:4]}_{day}_{s+1}')
                        window = self.model.NewBoolVar(f'g_win_{group[:4]}_{day}_{s}')

                        self.model.Add(sum(vars_at_s) >= 1).OnlyEnforceIf(busy_s)
                        self.model.Add(sum(vars_at_s) == 0).OnlyEnforceIf(busy_s.Not())
                        self.model.Add(sum(vars_at_s2) >= 1).OnlyEnforceIf(busy_s2)
                        self.model.Add(sum(vars_at_s2) == 0).OnlyEnforceIf(busy_s2.Not())
                        self.model.Add(sum(vars_at_s1) == 0).OnlyEnforceIf(free_s1)
                        self.model.Add(sum(vars_at_s1) >= 1).OnlyEnforceIf(free_s1.Not())

                        self.model.AddBoolAnd([busy_s, busy_s2, free_s1]).OnlyEnforceIf(window)
                        penalty_terms.append(window * 20)

        # Minimize total penalty
        if penalty_terms:
            self.model.Minimize(sum(penalty_terms))

        # ── Solve ──────────────────────────────────────────────────────────────
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 60
        solver.parameters.num_search_workers = 4
        solver.parameters.log_search_progress = False

        status = solver.Solve(self.model)

        elapsed_ms = int((time.time() - start_time) * 1000)

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            entries = []
            for (t_id, s_id, r_id, day, slot), var in vars.items():
                if solver.Value(var) == 1:
                    subject = subject_map.get(s_id, {})
                    entries.append({
                        "teacher_id": t_id,
                        "subject_id": s_id,
                        "room_id": r_id,
                        "day_of_week": day,
                        "slot_number": slot,
                        "student_group": subject.get('student_group', 'Default'),
                    })

            status_str = "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"
            return {
                "status": status_str,
                "entries": entries,
                "stats": {
                    "variables": len(vars),
                    "entries": len(entries),
                    "time_ms": elapsed_ms,
                    "solver_status": status_str,
                    "objective": solver.ObjectiveValue() if penalty_terms else 0,
                }
            }
        else:
            from conflict_extractor import ConflictExtractor
            extractor = ConflictExtractor(self.config)
            violations = extractor.extract()
            return {
                "status": "INFEASIBLE",
                "entries": [],
                "violations": violations,
                "stats": {
                    "variables": len(vars),
                    "time_ms": elapsed_ms,
                    "solver_status": "INFEASIBLE",
                }
            }
