import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function Auth() {
  const { dark, toggle } = useTheme()
  const [isLogin, setIsLogin] = useState(false)

  return (
    <div className="grain-overlay-container relative">
      <div className="grain-overlay" />
      <main className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Brand Panel */}
        <section className="hidden lg:flex lg:w-3/5 bg-surface-container relative overflow-hidden p-12 xl:p-20 flex-col justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--color-primary)_0%,transparent_60%)] opacity-10" />
          <div className="relative z-10">
            <Link to="/" className="font-clash text-3xl font-bold tracking-tighter text-primary">WAGORA</Link>
          </div>
          <div className="relative z-10 max-w-xl">
            <h1 className="font-clash text-6xl xl:text-7xl font-bold tracking-tight text-on-surface leading-none mb-8">
              Seek.<br />Engage.<br />Secure.
            </h1>
            <p className="font-satoshi text-lg text-on-surface-variant max-w-md leading-relaxed">
              Access the world's most advanced autonomous sales engine. Designed for high-level execution and architectural reliability.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-primary-container" />
            <span className="font-geist-mono text-xs uppercase tracking-widest text-on-surface-variant font-medium">System Active</span>
          </div>
        </section>

        {/* Right Form Panel */}
        <section className="w-full lg:w-2/5 bg-surface-container-lowest flex flex-col justify-center px-8 sm:px-16 lg:px-16 xl:px-20 py-12 relative min-h-screen">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-12">
            <Link to="/" className="font-clash text-2xl font-bold tracking-tighter text-on-surface">WAGORA</Link>
          </div>

          {/* Theme Toggle */}
          <button onClick={toggle} className="absolute top-6 right-6 p-2 rounded-lg hover:bg-surface-container transition-colors" aria-label="Toggle theme">
            <span className="material-symbols-outlined text-on-surface-variant">{dark ? 'light_mode' : 'dark_mode'}</span>
          </button>

          <div className="w-full max-w-sm mx-auto">
            <div className="mb-10">
              <h2 className="font-clash text-3xl font-bold text-on-surface mb-2">
                {isLogin ? 'Welcome back' : 'Create Account'}
              </h2>
              <p className="font-satoshi text-on-surface-variant">
                {isLogin ? 'Enter your credentials to access the dashboard.' : 'Initialize your autonomous sales engine.'}
              </p>
            </div>

            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="font-satoshi text-sm font-semibold text-on-surface-variant" htmlFor="name">Full Name</label>
                  <input className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/60 rounded-lg font-satoshi text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" id="name" placeholder="John Doe" type="text" />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="font-satoshi text-sm font-semibold text-on-surface-variant" htmlFor="email">{isLogin ? 'Email' : 'Corporate Email'}</label>
                <input className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/60 rounded-lg font-satoshi text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" id="email" placeholder="name@company.com" type="email" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-satoshi text-sm font-semibold text-on-surface-variant" htmlFor="password">Password</label>
                  {isLogin && <button type="button" className="font-satoshi text-xs text-primary hover:underline">Forgot?</button>}
                </div>
                <input className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/60 rounded-lg font-satoshi text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" id="password" placeholder="••••••••" type="password" />
              </div>

              {!isLogin && (
                <div className="flex items-start gap-3 pt-1">
                  <input className="w-4 h-4 mt-0.5 rounded-sm border-outline accent-primary" id="terms" type="checkbox" />
                  <label className="font-satoshi text-xs text-on-surface-variant leading-relaxed" htmlFor="terms">
                    I agree to the <a href="#" className="text-primary font-semibold hover:underline">Terms of Service</a> and <a href="#" className="text-primary font-semibold hover:underline">Privacy Policy</a>.
                  </label>
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-primary text-on-primary font-clash font-bold text-base rounded-lg hover:opacity-90 active:scale-[0.98] transition-all mt-2">
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="font-satoshi text-sm text-on-surface-variant">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-bold hover:underline ml-1">
                  {isLogin ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </div>

            {/* Footer Links */}
            <div className="mt-12 pt-8 border-t border-outline-variant/30 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start">
              {['Support', 'Privacy', 'Terms'].map(l => (
                <a key={l} href="#" className="font-geist-mono text-[10px] uppercase tracking-widest text-outline hover:text-primary transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
