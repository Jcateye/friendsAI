'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F7]">
      {/* Header */}
      <header className="flex h-16 items-center justify-between px-5">
        <div className="h-6 w-6" /> {/* Spacer */}
        <h1 className="text-lg font-semibold text-gray-900">friendsAI</h1>
        <div className="h-6 w-6" /> {/* Spacer */}
      </header>

      {/* Hero Section */}
      <section className="px-8 py-8">
        <h2 className="text-[32px] font-bold leading-tight text-gray-900">
          记住每一个人的重点
        </h2>
        <p className="mt-6 text-base leading-relaxed text-gray-600">
          不区分「AI / 非 AI」，不区分「联系人 / 会话」。
          <br />
          你只需要知道：我在跟某个人聊，系统会帮我记住重点。
        </p>
      </section>

      {/* Features */}
      <section className="flex flex-col gap-4 px-8 pb-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            💬
          </div>
          <h3 className="mb-1 text-base font-semibold text-gray-900">
            像 ChatGPT 一样聊天
          </h3>
          <p className="text-sm text-gray-600">
            单页聊天 + 左侧可折叠联系人列表
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-500">
            🧠
          </div>
          <h3 className="mb-1 text-base font-semibold text-gray-900">
            AI 自动提取重点
          </h3>
          <p className="text-sm text-gray-600">
            识别联系人信息，生成对话摘要
          </p>
        </div>

        {/* Start Button */}
        <Link
          href="/chat"
          className="mt-4 flex items-center justify-center rounded-full bg-[#007AFF] px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
        >
          开始聊天
        </Link>
        <p className="mt-3 text-center text-xs text-gray-400">
          当前为本地存储模式，清除浏览器数据后聊天记录可能丢失。
        </p>
      </section>
    </div>
  );
}
