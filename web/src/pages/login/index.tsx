import { useEffect, useRef } from "react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/app-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { SemanticButton } from "@/components/SemanticButton";
import { UserIcon, LockIcon } from "@/components/app-icons";
import { Navigate } from "react-router-dom";
import { useLogin } from "@/hooks/useAuth";
import type { LoginReq } from "@/api/types";
import { useAuthStore } from "@/stores/authStore";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import { AppLogo } from "@/components/AppLogo";
import { appMessage } from "@/utils/appMessage";

const REMEMBER_KEY = "harness-remember-username";

function loadRememberedUsername(): string | null {
  return localStorage.getItem(REMEMBER_KEY);
}

function saveRememberedUsername(username: string) {
  localStorage.setItem(REMEMBER_KEY, username);
}

function clearRememberedUsername() {
  localStorage.removeItem(REMEMBER_KEY);
}

export default function LoginPage() {
  const loginMutation = useLogin();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  /** 同步防抖：避免在 isPending 置位前连点触发多次 mutate */
  const loginInFlightRef = useRef(false);

  useEffect(() => {
    const rememberedUserName = loadRememberedUsername();
    if (rememberedUserName) {
      setUsername(rememberedUserName);
      setRemember(true);
    }
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginMutation.isPending || loginInFlightRef.current) {
      return;
    }
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      appMessage().error("请输入用户名");
      return;
    }
    if (!password) {
      appMessage().error("请输入密码");
      return;
    }
    loginInFlightRef.current = true;
    if (remember) {
      saveRememberedUsername(trimmedUsername);
    } else {
      clearRememberedUsername();
    }
    const payload: LoginReq = {
      username: trimmedUsername,
      password,
    };
    loginMutation.mutate(
      payload,
      {
        onSettled: () => {
          loginInFlightRef.current = false;
        },
      },
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-[#e8ecf8] via-[#eef2fc] to-[#e0e8f9] dark:from-[#0f1419] dark:via-[#111827] dark:to-[#172033]">
      <div className="absolute top-4 right-4 z-20">
        <AppearanceToggle />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[10%] -right-[5%] h-[70%] w-[55%] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-linear-to-br from-primary-300/50 to-primary-500/30" />
        <div className="absolute -bottom-[15%] -left-[10%] h-[65%] w-[60%] rounded-[60%_40%_30%_70%/50%_60%_40%_60%] bg-linear-to-tr from-primary-200/40 to-primary-400/20" />
        <div className="absolute top-[15%] left-[20%] h-[40%] w-[35%] rounded-[50%_50%_40%_60%/40%_60%_50%_50%] bg-linear-to-b from-primary-100/30 to-primary-300/15" />
      </div>

      {/* 左侧品牌区域 - 仅桌面端显示 */}
      <div className="relative z-10 mr-10 hidden max-w-[360px] lg:block">
        <div className="mb-4 flex items-center gap-2.5">
          <AppLogo size={44} className="drop-shadow-md" />
          <span className="text-[22px] font-bold text-gray-800 dark:text-gray-100">线束管理平台</span>
        </div>
        <h1 className="mb-3 text-3xl leading-tight font-bold text-gray-800 dark:text-gray-100">
          线束生产
          <br />
          全流程管理
        </h1>
        <p className="text-base leading-7 text-gray-500 dark:text-gray-300">
          覆盖委托单、线束明细、任务分配与状态跟踪，助力线束生产数字化管理。
        </p>
      </div>

      {/* 登录卡片 */}
      <Card className="relative z-10 mx-4 w-full max-w-[420px] rounded-2xl border-white/60 bg-white/90 px-8 py-7 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-[#151b22]/90">
        {/* 移动端 Logo */}
        <div className="mb-5 flex items-center gap-3 lg:hidden">
          <AppLogo size={40} className="drop-shadow-sm" />
          <span className="text-xl font-semibold text-gray-800 dark:text-gray-100">线束管理平台</span>
        </div>

        <h3 className="mb-2 text-xl font-semibold text-gray-800 max-lg:hidden dark:text-gray-100">欢迎回来</h3>
        <p className="mb-5 text-sm text-gray-400 max-lg:hidden dark:text-gray-400">请输入账号和密码登录系统</p>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3">
          <Input
            prefix={<UserIcon />}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="用户名"
            className="h-[38px] rounded-[11px] border border-slate-400/35 bg-white/80 pl-9 pr-3 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400 hover:border-primary/45 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-primary/20 dark:border-white/20 dark:bg-white/6 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <Input.Password
            prefix={<LockIcon />}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="密码"
            className="h-[38px] rounded-[11px] border border-slate-400/35 bg-white/80 pl-9 pr-10 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400 hover:border-primary/45 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-primary/20 dark:border-white/20 dark:bg-white/6 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <label className="inline-flex select-none items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
            <Checkbox
              checked={remember}
              onCheckedChange={(nextChecked) => setRemember(nextChecked === true)}
            />
            记住用户名
          </label>

          <SemanticButton
            htmlType="submit"
            loading={loginMutation.isPending}
            disabled={loginMutation.isPending}
            block
            className="h-9! rounded-lg! text-sm! font-medium!"
          >
            登 录
          </SemanticButton>
        </form>
      </Card>
    </div>
  );
}
