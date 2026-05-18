import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  async function loginEmail() {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function register() {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert('Conta criada');
      navigate('/home');
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function loginGoogle() {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/home');
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function loginLink() {
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: window.location.origin,
        handleCodeInApp: true,
      });

      localStorage.setItem('emailForSignIn', email);
      alert('Link enviado para o email, verifique sua caixa de correio');
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  return (
    <main className="login-page">
      <div className="login-wrap">
        <div className="login-html">
          <input id="tab-1" type="radio" name="tab" className="sign-in" defaultChecked />
          <label htmlFor="tab-1" className="tab">
            Sign In
          </label>

          <input id="tab-2" type="radio" name="tab" className="sign-up" />
          <label htmlFor="tab-2" className="tab">
            Sign Up
          </label>

          <div className="login-form">
            <div className="sign-in-htm">
              <div className="group">
                <label htmlFor="email-login" className="label">
                  Email
                </label>
                <input
                  id="email-login"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="group">
                <label htmlFor="pass-login" className="label">
                  Password
                </label>
                <input
                  id="pass-login"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="group">
                <button className="button" type="button" onClick={loginEmail}>
                  Sign In
                </button>
              </div>

              <div className="group">
                <button className="button" type="button" onClick={loginGoogle}>
                  Login com Google
                </button>
              </div>

              <div className="group">
                <button className="button" type="button" onClick={loginLink}>
                  Entrar com Link
                </button>
              </div>

              <div className="hr" />
            </div>

            <div className="sign-up-htm">
              <div className="group">
                <label htmlFor="email-register" className="label">
                  Email
                </label>
                <input
                  id="email-register"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="group">
                <label htmlFor="pass-register" className="label">
                  Password
                </label>
                <input
                  id="pass-register"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="group">
                <button className="button" type="button" onClick={register}>
                  Sign Up
                </button>
              </div>

              <div className="hr" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
