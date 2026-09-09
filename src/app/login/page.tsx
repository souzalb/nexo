import { LoginForm } from '../_components/login-form';
import { AnimatedBackground } from '../_components/animated-background';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  );
}
