/**
 * FriendsAIProvider
 * 封装 AssistantRuntimeProvider，集成认证和会话上下文
 */

import { ReactNode } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useFriendsAIRuntime, UseFriendsAIRuntimeOptions } from './FriendsAIRuntime';

export interface FriendsAIProviderProps extends UseFriendsAIRuntimeOptions {
  /**
   * 子组件
   */
  children: ReactNode;
}

/**
 * FriendsAIProvider
 * 提供 FriendsAI 运行时上下文
 */
export function FriendsAIProvider({
  children,
  ...runtimeOptions
}: FriendsAIProviderProps) {
  // 创建运行时
  const runtime = useFriendsAIRuntime(runtimeOptions);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}




