'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Brain, Mail, Lock, User as UserIcon, Eye, EyeOff, Sparkles, Shield, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import useAuthStore from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Minimum 6 characters'),
  role: z.literal('admin'),
});

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const schema = mode === 'login' ? loginSchema : registerSchema;
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'admin' }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await authApi.login(data)
        : await authApi.register(data);
      login(result.token, result.user, result.institution);
      
      const roleName = result.user.role.charAt(0).toUpperCase() + result.user.role.slice(1);
      toast.success(`${roleName} Login Successful! 🚀`);
      router.push('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Invalid email or password';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple mb-4 shadow-lg shadow-primary/30">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-outfit text-2xl font-bold text-text-primary">University Portal</h1>
          <p className="text-text-secondary text-sm mt-1 uppercase tracking-widest font-bold text-[10px]">
            {mode === 'login' ? 'Authorized System Access' : 'System Administrator Setup'}
          </p>
        </div>

        <div className="card border-primary/20 bg-surface/50 backdrop-blur-xl">
          <div className="flex bg-elevated rounded-xl p-1 mb-6 border border-border">
            {['login', 'register'].map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${mode === m ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}>
                {m === 'login' ? 'Sign In' : 'Setup Admin'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-4">
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl mb-2 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <p className="text-[10px] text-text-secondary leading-tight">
                    This registration is for <strong>Administrators</strong> only. Teachers and Students are added by the admin after login.
                  </p>
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input {...register('name')} className="input-field pl-10" placeholder="Admin Name" />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input {...register('email')} type="email" className="input-field pl-10" placeholder="Registered Email" />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input-field pl-10 pr-10" placeholder="Password" />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary p-1">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> {mode === 'login' ? 'Access Portal' : 'Create Admin Account'}</>}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="p-3 bg-elevated/50 rounded-xl border border-border/50 text-center">
                <p className="text-text-secondary text-[10px] leading-relaxed">
                  Teachers & Students: Please use the credentials provided by your Administrator to log in.
                </p>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-text-secondary text-[10px] mt-8 uppercase tracking-[0.2em] font-medium opacity-50">
          Institutional Scheduling System • 2024
        </p>
      </motion.div>
    </div>
  );
}
