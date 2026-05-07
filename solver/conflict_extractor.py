class ConflictExtractor:
    def __init__(self, config):
        self.config = config
        self.working_days = config.get('working_days', 5)
        self.slots_per_day = config.get('slots_per_day', 8)
        self.teachers = config.get('teachers', [])
        self.subjects = config.get('subjects', [])
        self.rooms = config.get('rooms', [])

    def extract(self):
        violations = []

        # Check 1: Teacher overload
        for teacher in self.teachers:
            total_periods_needed = 0
            subject_ids = teacher.get('subject_ids', [])
            for s_id in subject_ids:
                subject = next((s for s in self.subjects if s['id'] == s_id), None)
                if subject:
                    total_periods_needed += subject.get('periods_per_week', 0)

            max_week = teacher.get('max_periods_per_week', 30)
            unavailable = len(teacher.get('unavailable_slots', []))
            available_slots = self.working_days * (self.slots_per_day - 1) - unavailable  # -1 for lunch

            if total_periods_needed > max_week:
                violations.append({
                    "type": "teacher_overload",
                    "entity": teacher.get('name', teacher['id']),
                    "message": f"Teacher {teacher.get('name', teacher['id'])} needs {total_periods_needed} periods/week but max is {max_week}",
                    "severity": "HIGH",
                })

            if total_periods_needed > available_slots:
                violations.append({
                    "type": "teacher_availability_shortage",
                    "entity": teacher.get('name', teacher['id']),
                    "message": f"Teacher {teacher.get('name', teacher['id'])} needs {total_periods_needed} periods but only has {available_slots} available slots",
                    "severity": "HIGH",
                })

        # Check 2: No teacher assigned to subject
        for subject in self.subjects:
            s_id = subject['id']
            teachers_for_s = [t for t in self.teachers if s_id in t.get('subject_ids', [])]
            if not teachers_for_s:
                violations.append({
                    "type": "no_teacher_for_subject",
                    "entity": subject.get('name', s_id),
                    "message": f"No teacher assigned to subject: {subject.get('name', s_id)}",
                    "severity": "HIGH",
                })

        # Check 3: Lab shortage
        lab_subjects = [s for s in self.subjects if s.get('requires_lab', False)]
        lab_rooms = [r for r in self.rooms if r.get('is_lab', False)]
        if lab_subjects and not lab_rooms:
            violations.append({
                "type": "no_lab_rooms",
                "entity": "Labs",
                "message": f"{len(lab_subjects)} subjects require lab but no lab rooms available",
                "severity": "HIGH",
            })

        # Check 4: Total periods vs available slots
        total_periods_needed = sum(s.get('periods_per_week', 0) for s in self.subjects)
        total_slots_available = self.working_days * (self.slots_per_day - 1) * max(len(self.rooms), 1)
        if total_periods_needed > total_slots_available:
            violations.append({
                "type": "insufficient_slots",
                "entity": "Schedule",
                "message": f"Need {total_periods_needed} total slots but only {total_slots_available} available",
                "severity": "HIGH",
            })

        # Check 5: Student group conflicts
        groups = {}
        for s in self.subjects:
            group = s.get('student_group', 'Default')
            if group not in groups:
                groups[group] = 0
            groups[group] += s.get('periods_per_week', 0)

        for group, total in groups.items():
            available = self.working_days * (self.slots_per_day - 1)
            if total > available:
                violations.append({
                    "type": "group_overload",
                    "entity": group,
                    "message": f"Group {group} has {total} periods scheduled but only {available} slots available per week",
                    "severity": "HIGH",
                })

        if not violations:
            violations.append({
                "type": "unknown",
                "entity": "System",
                "message": "Solver could not find feasible solution within time limit. Try reducing constraints.",
                "severity": "MEDIUM",
            })

        return violations
