"use client";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { LOGO_SRC } from "../../_lib/logo";
import { SCHOOL_NAMES } from "../../_lib/i18n";
import { apiLogin } from "../../../lib/api-client";
import LangSwitch from "../LangSwitch";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Login screen. Credentials are checked server-side against the database
// (POST /api/auth/login), which sets the session cookie all API routes require.
// Parents have no account — they sign in with their child's admission number.
export default function LoginScreen({ t, dir, lang, setLang, setCurrentUser, setPage }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const attemptLogin = async (uname, pwd) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { user } = await apiLogin(uname, pwd);
      setCurrentUser(user);
      setPage(user.role === "parent" ? "myResults" : "dashboard");
    } catch (e) {
      setError(e.message === "suspended" ? t.login.accountSuspended : t.login.invalidCreds);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    attemptLogin(username, password);
  };

  return (
    <div
      dir={dir}
      // Page sits darker than the card's brand panel, so the card reads as a
      // distinct surface instead of dissolving into the background.
      className="flex min-h-[100dvh] items-center justify-center bg-[#0a1710] p-3 md:p-5"
    >
      <Card className="w-full max-w-[880px] overflow-hidden p-0 shadow-2xl">
        <CardContent className="grid gap-0 p-0 md:grid-cols-2">
          {/* Brand panel — compact header on phones, full column on desktop. */}
          <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#24503c] to-primary px-5 py-7 text-center md:px-9 md:py-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="School logo"
              className="size-18 rounded-2xl bg-white object-contain p-2 md:size-30"
            />
            <p className="text-[13px] font-extrabold leading-relaxed tracking-wide text-gold md:text-[15px]">
              {SCHOOL_NAMES.junior[lang]}
            </p>
            <span aria-hidden="true" className="h-0.5 w-10 bg-gold" />
            
            <p className="mt-2 text-xs text-white/60">{t.appSubtitle}</p>
          </div>

          {/* Form panel */}
          <form onSubmit={onSubmit} className="flex flex-col justify-center gap-4 bg-card px-5 py-7 md:px-9 md:py-10">
            <div>
              <h2 className="text-xl font-bold text-primary md:text-[22px]">{t.login.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.login.subtitle}</p>
            </div>

            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="username">{t.login.username}</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. admin or 1064"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password">{t.login.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={busy} className="w-full">
              {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {busy ? "…" : t.login.signIn}
            </Button>

            <div className="flex justify-center">
              <LangSwitch lang={lang} setLang={setLang} />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
