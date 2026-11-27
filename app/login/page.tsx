"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient, browserDemo } from "@/lib/supabase/browser";

/** Organisers sign in with a 6-digit code sent to their email. No passwords to forget. */
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    if (browserDemo) { setMsg("Sign-in switches on once Moona's database is connected."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setMsg("Enter a valid email address."); return; }
    setBusy(true);
    const { error } = await browserClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setMsg("We couldn't send a code. Check the address and try again."); else setStep("code");
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setMsg(""); setBusy(true);
    const { error } = await browserClient().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) { setMsg("That code didn't work. Check it, or send a new one."); return; }
    router.push("/host"); router.refresh();
  }

  return (
    <section className="sec" style={{ maxWidth: 440, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(32px,7vw,48px)" }}>Sign in to <em>host</em></h1>
      <p className="dim">Guests never need an account. Hosts sign in with a code sent to their email.</p>
      {step === "email" ? (
        <form className="stack" onSubmit={sendCode}>
          <label className="field"><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button className="btn gold block" disabled={busy}>{busy ? "Sending…" : "Send me a code"}</button>
        </form>
      ) : (
        <form className="stack" onSubmit={verify}>
          <label className="field"><span>6-digit code sent to {email}</span><input inputMode="numeric" autoComplete="one-time-code" className="big" value={code} onChange={(e) => setCode(e.target.value)} /></label>
          <button className="btn gold block" disabled={busy}>{busy ? "Checking…" : "Sign in"}</button>
          <button className="btn block" type="button" onClick={() => setStep("email")}>Use a different email</button>
        </form>
      )}
      <p role="alert" style={{ color: "var(--bad)" }}>{msg}</p>
    </section>
  );
}
