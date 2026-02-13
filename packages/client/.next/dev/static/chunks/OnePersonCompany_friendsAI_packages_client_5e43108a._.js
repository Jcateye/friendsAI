(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChatComposer",
    ()=>ChatComposer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/send.js [app-client] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mic$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/mic.js [app-client] (ecmascript) <export default as Mic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Image$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/image.js [app-client] (ecmascript) <export default as Image>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/camera.js [app-client] (ecmascript) <export default as Camera>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$play$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileVideo$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/file-play.js [app-client] (ecmascript) <export default as FileVideo>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$locate$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Locate$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/locate.js [app-client] (ecmascript) <export default as Locate>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
const TOOL_ICONS = [
    {
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"],
        name: 'add'
    },
    {
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Image$3e$__["Image"],
        name: 'image'
    },
    {
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__["Camera"],
        name: 'camera'
    },
    {
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$play$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileVideo$3e$__["FileVideo"],
        name: 'gif'
    },
    {
        Icon: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$locate$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Locate$3e$__["Locate"],
        name: 'location'
    }
];
function ChatComposer({ onSendMessage, onToolAction, onVoiceInput, disabled = false }) {
    _s();
    const [input, setInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const handleSend = ()=>{
        const trimmed = input.trim();
        if (!trimmed) {
            return;
        }
        onSendMessage(trimmed);
        setInput('');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "border-t border-gray-200 bg-[#F5F5F7] px-3 py-3",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-col gap-1.5",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex h-7 items-center gap-4",
                    children: TOOL_ICONS.map(({ Icon, name })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: ()=>onToolAction(name),
                            className: "text-gray-400 transition-colors hover:text-gray-600",
                            "aria-label": name,
                            disabled: disabled,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                className: "h-5 w-5"
                            }, void 0, false, {
                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
                                lineNumber: 52,
                                columnNumber: 15
                            }, this)
                        }, name, false, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
                            lineNumber: 44,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
                    lineNumber: 42,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "text",
                            value: input,
                            onChange: (e)=>setInput(e.target.value),
                            onKeyDown: (e)=>{
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            },
                            placeholder: "输入消息…",
                            disabled: disabled,
                            className: "flex-1 rounded-[20px] border border-gray-200 bg-white px-4 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        }, void 0, false, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
                            lineNumber: 58,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: onVoiceInput,
                            className: "flex h-9 w-9 items-center justify-center text-gray-900 transition-colors hover:text-gray-600",
                            "aria-label": "Voice input",
                            disabled: disabled,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mic$3e$__["Mic"], {
                                className: "h-5 w-5"
                            }, void 0, false, {
                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
                                lineNumber: 80,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
                            lineNumber: 73,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: handleSend,
                            disabled: disabled || !input.trim(),
                            className: "flex h-9 w-9 items-center justify-center rounded-full bg-[#007AFF] text-white transition-colors hover:bg-blue-600 disabled:opacity-50",
                            "aria-label": "Send message",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                className: "h-4 w-4"
                            }, void 0, false, {
                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
                                lineNumber: 90,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
                            lineNumber: 83,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
                    lineNumber: 57,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
            lineNumber: 41,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx",
        lineNumber: 40,
        columnNumber: 5
    }, this);
}
_s(ChatComposer, "WVveI0ACa0LqOSOlGzu58xcz+KE=");
_c = ChatComposer;
var _c;
__turbopack_context__.k.register(_c, "ChatComposer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/packages/client/stores/chat.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useChatStore",
    ()=>useChatStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
const useChatStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set)=>({
        // Initial state
        activeContactId: null,
        isDrawerOpen: false,
        contacts: [],
        messages: {},
        // Actions
        setActiveContact: (contactId)=>set({
                activeContactId: contactId,
                isDrawerOpen: false
            }),
        toggleDrawer: ()=>set((state)=>({
                    isDrawerOpen: !state.isDrawerOpen
                })),
        setDrawerOpen: (open)=>set({
                isDrawerOpen: open
            }),
        setContacts: (contacts)=>set({
                contacts
            }),
        addContact: (contact)=>set((state)=>({
                    contacts: [
                        ...state.contacts,
                        contact
                    ]
                })),
        setMessages: (contactId, messages)=>set((state)=>({
                    messages: {
                        ...state.messages,
                        [contactId]: messages
                    }
                })),
        addMessage: (contactId, message)=>set((state)=>({
                    messages: {
                        ...state.messages,
                        [contactId]: [
                            ...state.messages[contactId] || [],
                            message
                        ]
                    }
                })),
        updateMessage: (contactId, messageId, updater)=>set((state)=>({
                    messages: {
                        ...state.messages,
                        [contactId]: (state.messages[contactId] || []).map((message)=>message.id === messageId ? updater(message) : message)
                    }
                }))
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatHeader.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChatHeader",
    ()=>ChatHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/menu.js [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2d$vertical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreVertical$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/ellipsis-vertical.js [app-client] (ecmascript) <export default as MoreVertical>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$stores$2f$chat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/stores/chat.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
function ChatHeader({ contact }) {
    _s();
    const toggleDrawer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$stores$2f$chat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatHeader.useChatStore[toggleDrawer]": (state)=>state.toggleDrawer
    }["ChatHeader.useChatStore[toggleDrawer]"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "flex h-16 items-center justify-between border-b border-gray-200 bg-[#F5F5F7] px-5",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: toggleDrawer,
                className: "flex h-6 w-6 items-center justify-center text-gray-900",
                "aria-label": "Open contacts",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                    className: "h-6 w-6"
                }, void 0, false, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatHeader.tsx",
                    lineNumber: 19,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatHeader.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-base font-semibold text-gray-900",
                children: contact?.name || '新联系人'
            }, void 0, false, {
                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatHeader.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: "flex h-6 w-6 items-center justify-center text-gray-900",
                "aria-label": "More options",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2d$vertical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreVertical$3e$__["MoreVertical"], {
                    className: "h-6 w-6"
                }, void 0, false, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatHeader.tsx",
                    lineNumber: 30,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatHeader.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatHeader.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_s(ChatHeader, "i+wvdHYeMJxzC4S7k01Yv4zyPfY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$stores$2f$chat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = ChatHeader;
var _c;
__turbopack_context__.k.register(_c, "ChatHeader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessageBubble",
    ()=>MessageBubble
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$react$2d$markdown$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Markdown__as__default$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/react-markdown/lib/index.js [app-client] (ecmascript) <export Markdown as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bot$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bot$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/bot.js [app-client] (ecmascript) <export default as Bot>");
;
;
;
const AVATAR_COLORS = {
    user: '#007AFF',
    assistant: '#E5E5EA'
};
function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `flex w-full ${isUser ? 'justify-end' : 'justify-start'}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-[260px] rounded-[20px] px-3 py-3",
            style: {
                backgroundColor: isUser ? AVATAR_COLORS.user : AVATAR_COLORS.assistant
            },
            children: [
                message.toolCalls && message.toolCalls.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-2 space-y-1",
                    children: message.toolCalls.map((tool)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-lg bg-white/50 p-2 text-xs",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-1 font-semibold",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bot$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bot$3e$__["Bot"], {
                                            className: "h-3 w-3"
                                        }, void 0, false, {
                                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                                            lineNumber: 34,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: tool.name
                                        }, void 0, false, {
                                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                                            lineNumber: 35,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                                    lineNumber: 33,
                                    columnNumber: 17
                                }, this),
                                tool.result && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-1 text-gray-600",
                                    children: tool.result
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                                    lineNumber: 38,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, tool.id, true, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                            lineNumber: 29,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                    lineNumber: 27,
                    columnNumber: 11
                }, this),
                isUser ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm leading-relaxed whitespace-pre-wrap text-white",
                    children: message.content
                }, void 0, false, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                    lineNumber: 45,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-sm leading-relaxed text-gray-900 [&_a]:text-blue-600 [&_a]:underline [&_a]:break-all [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/5 [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$react$2d$markdown$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Markdown__as__default$3e$__["default"], {
                        allowedElements: [
                            'p',
                            'br',
                            'strong',
                            'em',
                            'del',
                            'ul',
                            'ol',
                            'li',
                            'blockquote',
                            'code',
                            'pre',
                            'a',
                            'h1',
                            'h2',
                            'h3',
                            'h4',
                            'h5',
                            'h6'
                        ],
                        skipHtml: true,
                        components: {
                            a: ({ href, children, ...props })=>{
                                const safeHref = href && /^(https?:|mailto:)/i.test(href) ? href : undefined;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    ...props,
                                    href: safeHref,
                                    rel: "noopener noreferrer nofollow",
                                    target: "_blank",
                                    children: children
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                                    lineNumber: 78,
                                    columnNumber: 21
                                }, void 0);
                            }
                        },
                        children: message.content
                    }, void 0, false, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                        lineNumber: 50,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
                    lineNumber: 49,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_c = MessageBubble;
var _c;
__turbopack_context__.k.register(_c, "MessageBubble");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ContactPreviewCard",
    ()=>ContactPreviewCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/mail.js [app-client] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/building-2.js [app-client] (ecmascript) <export default as Building2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$briefcase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Briefcase$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/briefcase.js [app-client] (ecmascript) <export default as Briefcase>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tag$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/tag.js [app-client] (ecmascript) <export default as Tag>");
;
;
function ContactPreviewCard({ card, pendingConfirmation = false, onConfirm, onDismiss }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-2 my-2 rounded-[16px] border border-gray-200 bg-white p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-3",
            children: [
                card.name && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                        className: "text-base font-semibold text-gray-900",
                        children: card.name
                    }, void 0, false, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                        lineNumber: 23,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                    lineNumber: 22,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-2 text-sm text-gray-600",
                    children: [
                        card.email && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                    className: "h-4 w-4 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                                    lineNumber: 33,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: card.email
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                                    lineNumber: 34,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                            lineNumber: 32,
                            columnNumber: 13
                        }, this),
                        card.phone && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                    className: "h-4 w-4 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                                    lineNumber: 39,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: card.phone
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                                    lineNumber: 40,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                            lineNumber: 38,
                            columnNumber: 13
                        }, this),
                        card.company && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"], {
                                    className: "h-4 w-4 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                                    lineNumber: 45,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: card.company
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                                    lineNumber: 46,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                            lineNumber: 44,
                            columnNumber: 13
                        }, this),
                        card.title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$briefcase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Briefcase$3e$__["Briefcase"], {
                                    className: "h-4 w-4 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                                    lineNumber: 51,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: card.title
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                                    lineNumber: 52,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                            lineNumber: 50,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                    lineNumber: 30,
                    columnNumber: 9
                }, this),
                card.tags && card.tags.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap gap-1.5",
                    children: card.tags.map((tag, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tag$3e$__["Tag"], {
                                    className: "h-3 w-3"
                                }, void 0, false, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                                    lineNumber: 65,
                                    columnNumber: 17
                                }, this),
                                tag
                            ]
                        }, index, true, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                            lineNumber: 61,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                    lineNumber: 59,
                    columnNumber: 11
                }, this),
                card.notes && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-lg bg-gray-50 p-2 text-sm text-gray-600",
                    children: card.notes
                }, void 0, false, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                    lineNumber: 74,
                    columnNumber: 11
                }, this),
                pendingConfirmation && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 pt-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: onConfirm,
                            className: "rounded-full bg-[#007AFF] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600",
                            children: "确认添加联系人"
                        }, void 0, false, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                            lineNumber: 81,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: onDismiss,
                            className: "rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100",
                            children: "暂不添加"
                        }, void 0, false, {
                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                            lineNumber: 88,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
                    lineNumber: 80,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
            lineNumber: 19,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_c = ContactPreviewCard;
var _c;
__turbopack_context__.k.register(_c, "ContactPreviewCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageList.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessageList",
    ()=>MessageList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$MessageBubble$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageBubble.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$ContactPreviewCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ContactPreviewCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
;
;
;
const MessageList = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c = ({ messages, onConfirmContactCard, onDismissContactCard }, ref)=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: "flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4",
        children: messages.map((message)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$MessageBubble$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessageBubble"], {
                        message: message
                    }, void 0, false, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageList.tsx",
                        lineNumber: 22,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    message.contactCard && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$ContactPreviewCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ContactPreviewCard"], {
                        card: message.contactCard,
                        pendingConfirmation: Boolean(message.pendingContactCardConfirmation),
                        onConfirm: ()=>onConfirmContactCard(message.id),
                        onDismiss: ()=>onDismissContactCard(message.id)
                    }, void 0, false, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageList.tsx",
                        lineNumber: 24,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, message.id, true, {
                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageList.tsx",
                lineNumber: 21,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0)))
    }, void 0, false, {
        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageList.tsx",
        lineNumber: 16,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = MessageList;
MessageList.displayName = 'MessageList';
var _c, _c1;
__turbopack_context__.k.register(_c, "MessageList$forwardRef");
__turbopack_context__.k.register(_c1, "MessageList");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ContactsDrawer",
    ()=>ContactsDrawer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$stores$2f$chat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/stores/chat.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
function ContactsDrawer({ onAddContact }) {
    _s();
    const { isDrawerOpen, setDrawerOpen, contacts, activeContactId, setActiveContact } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$stores$2f$chat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    if (!isDrawerOpen) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-40 bg-black/20",
                onClick: ()=>setDrawerOpen(false)
            }, void 0, false, {
                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: "fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-gray-200 bg-white",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "flex h-16 items-center justify-between border-b border-gray-200 px-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-base font-semibold text-gray-900",
                                children: "联系人"
                            }, void 0, false, {
                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                lineNumber: 23,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "flex h-6 w-6 items-center justify-center text-blue-500",
                                        "aria-label": "Add contact",
                                        onClick: onAddContact,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                            className: "h-5 w-5"
                                        }, void 0, false, {
                                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                            lineNumber: 32,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                        lineNumber: 26,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>setDrawerOpen(false),
                                        className: "flex h-6 w-6 items-center justify-center text-gray-400",
                                        "aria-label": "Close drawer",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                            className: "h-5 w-5"
                                        }, void 0, false, {
                                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                            lineNumber: 40,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                        lineNumber: 34,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                lineNumber: 25,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                        lineNumber: 22,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto p-2",
                        children: [
                            contacts.map((contact)=>{
                                const isActive = contact.id === activeContactId;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setActiveContact(contact.id),
                                    className: `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex h-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium text-white",
                                            style: {
                                                backgroundColor: contact.avatarColor
                                            },
                                            children: contact.name.charAt(0).toUpperCase()
                                        }, void 0, false, {
                                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                            lineNumber: 58,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "flex-1 truncate text-sm font-medium text-gray-900",
                                            children: contact.name
                                        }, void 0, false, {
                                            fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                            lineNumber: 65,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, contact.id, true, {
                                    fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                    lineNumber: 50,
                                    columnNumber: 15
                                }, this);
                            }),
                            contacts.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "py-8 text-center text-sm text-gray-400",
                                children: "暂无联系人"
                            }, void 0, false, {
                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                                lineNumber: 73,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(ContactsDrawer, "8cVfJIdKgKHRrKWk1UZKons85RQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$stores$2f$chat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = ContactsDrawer;
var _c;
__turbopack_context__.k.register(_c, "ContactsDrawer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/packages/client/lib/db.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FriendsDatabase",
    ()=>FriendsDatabase,
    "clearAllData",
    ()=>clearAllData,
    "db",
    ()=>db,
    "getAllContacts",
    ()=>getAllContacts,
    "getMessagesByContact",
    ()=>getMessagesByContact,
    "saveContact",
    ()=>saveContact,
    "saveContactCard",
    ()=>saveContactCard,
    "saveMessage",
    ()=>saveMessage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$dexie$2f$import$2d$wrapper$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/dexie/import-wrapper.mjs [app-client] (ecmascript)");
;
class FriendsDatabase extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$dexie$2f$import$2d$wrapper$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"] {
    contacts;
    messages;
    conversations;
    contactCards;
    constructor(){
        super('FriendsAI');
        this.version(1).stores({
            contacts: 'id, name, createdAt, updatedAt',
            messages: 'id, contactId, role, createdAt',
            conversations: 'id, contactId, lastMessageAt, messageCount',
            contactCards: 'id, name, email, phone, company, createdAt, sourceMessageId'
        });
    }
}
const db = new FriendsDatabase();
async function getAllContacts() {
    return db.contacts.orderBy('updatedAt').reverse().toArray();
}
async function saveContact(contact) {
    await db.contacts.put(contact);
}
async function getMessagesByContact(contactId) {
    return db.messages.where('contactId').equals(contactId).sortBy('createdAt');
}
async function saveMessage(message) {
    await db.messages.put(message);
}
async function saveContactCard(card) {
    await db.contactCards.put(card);
}
async function clearAllData() {
    await db.transaction('rw', db.contacts, db.messages, db.contactCards, async ()=>{
        await db.contacts.clear();
        await db.messages.clear();
        await db.contactCards.clear();
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChatPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$ChatComposer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatComposer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$ChatHeader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/components/chat/ChatHeader.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$MessageList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/components/chat/MessageList.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$drawer$2f$ContactsDrawer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/components/drawer/ContactsDrawer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/lib/db.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$stores$2f$chat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/stores/chat.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
const AVATAR_COLORS = [
    '#007AFF',
    '#34C759',
    '#FF9500',
    '#AF52DE',
    '#FF3B30',
    '#5856D6',
    '#FFCC00'
];
const INITIAL_CONTACTS = [
    {
        id: 'contact-zhangsan',
        name: '张三',
        avatarColor: AVATAR_COLORS[0],
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'contact-lisi',
        name: '李四',
        avatarColor: AVATAR_COLORS[1],
        createdAt: new Date(),
        updatedAt: new Date()
    }
];
function createMessageId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function createContactName(contactCount) {
    return `新联系人${contactCount + 1}`;
}
function mapToolName(tool) {
    if (tool === 'add') return '添加附件';
    if (tool === 'image') return '图片';
    if (tool === 'camera') return '拍照';
    if (tool === 'gif') return 'GIF';
    return '位置';
}
function buildChatToolsPayload(isFeishuToolEnabled, feishuMode) {
    if (!isFeishuToolEnabled) {
        return {
            enabled: [
                'extract_contact_info'
            ]
        };
    }
    return {
        enabled: [
            'extract_contact_info',
            'feishu_template_message'
        ],
        feishuTemplateMessage: {
            mode: feishuMode
        }
    };
}
function ChatPage() {
    _s();
    const { activeContactId, contacts, messages, setContacts, addContact, setActiveContact, setMessages, addMessage, updateMessage } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$stores$2f$chat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isFeishuToolEnabled, setIsFeishuToolEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [feishuMode, setFeishuMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('sync');
    const messagesEndRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            const bootstrap = {
                "ChatPage.useEffect.bootstrap": async ()=>{
                    try {
                        const storedContacts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAllContacts"])();
                        const initialContacts = storedContacts.length > 0 ? storedContacts : INITIAL_CONTACTS;
                        if (storedContacts.length === 0) {
                            await Promise.all(initialContacts.map({
                                "ChatPage.useEffect.bootstrap": (contact)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveContact"])(contact)
                            }["ChatPage.useEffect.bootstrap"]));
                        }
                        setContacts(initialContacts);
                        if (initialContacts.length > 0) {
                            setActiveContact(initialContacts[0].id);
                        }
                    } catch  {
                        setContacts(INITIAL_CONTACTS);
                        setActiveContact(INITIAL_CONTACTS[0].id);
                    }
                }
            }["ChatPage.useEffect.bootstrap"];
            void bootstrap();
        }
    }["ChatPage.useEffect"], [
        setActiveContact,
        setContacts
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            const loadActiveMessages = {
                "ChatPage.useEffect.loadActiveMessages": async ()=>{
                    if (!activeContactId) {
                        return;
                    }
                    try {
                        const storedMessages = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMessagesByContact"])(activeContactId);
                        setMessages(activeContactId, storedMessages);
                    } catch  {
                        setMessages(activeContactId, []);
                    }
                }
            }["ChatPage.useEffect.loadActiveMessages"];
            void loadActiveMessages();
        }
    }["ChatPage.useEffect"], [
        activeContactId,
        setMessages
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            messagesEndRef.current?.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }["ChatPage.useEffect"], [
        activeContactId,
        messages
    ]);
    const activeContact = contacts.find((contact)=>contact.id === activeContactId) ?? null;
    const currentMessages = activeContactId ? messages[activeContactId] ?? [] : [];
    const updateMessageById = async (contactId, messageId, updater)=>{
        const targetMessage = (messages[contactId] ?? []).find((message)=>message.id === messageId);
        if (!targetMessage) {
            return;
        }
        const updatedMessage = updater(targetMessage);
        updateMessage(contactId, messageId, updater);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMessage"])(updatedMessage);
        } catch  {
        // Keep optimistic UI behavior for local-first flow.
        }
    };
    const handleConfirmContactCard = async (messageId)=>{
        if (!activeContactId) {
            return;
        }
        const message = (messages[activeContactId] ?? []).find((item)=>item.id === messageId);
        if (!message?.contactCard) {
            return;
        }
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveContactCard"])(message.contactCard);
        } catch  {
        // Keep optimistic UI behavior for local-first flow.
        }
        await updateMessageById(activeContactId, messageId, (item)=>({
                ...item,
                pendingContactCardConfirmation: false
            }));
    };
    const handleDismissContactCard = async (messageId)=>{
        if (!activeContactId) {
            return;
        }
        await updateMessageById(activeContactId, messageId, (item)=>({
                ...item,
                pendingContactCardConfirmation: false
            }));
    };
    const handleAddContact = async ()=>{
        const newContact = {
            id: createMessageId('contact'),
            name: createContactName(contacts.length),
            avatarColor: AVATAR_COLORS[contacts.length % AVATAR_COLORS.length],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        addContact(newContact);
        setActiveContact(newContact.id);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveContact"])(newContact);
        } catch  {
        // Keep optimistic UI behavior for local-first flow.
        }
    };
    const handleToolAction = async (tool)=>{
        if (!activeContactId) {
            return;
        }
        const toolMessage = {
            id: createMessageId('tool-action'),
            contactId: activeContactId,
            role: 'assistant',
            content: '',
            toolCalls: [
                {
                    id: createMessageId('tool-call'),
                    name: mapToolName(tool),
                    arguments: {},
                    result: `${mapToolName(tool)}功能将在后续版本开放`
                }
            ],
            createdAt: new Date()
        };
        addMessage(activeContactId, toolMessage);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMessage"])(toolMessage);
        } catch  {
        // Keep optimistic UI behavior for local-first flow.
        }
    };
    const handleVoiceInput = async ()=>{
        if (!activeContactId) {
            return;
        }
        const voiceMessage = {
            id: createMessageId('voice-hint'),
            contactId: activeContactId,
            role: 'assistant',
            content: '语音输入暂未接入，请先使用文本输入。',
            createdAt: new Date()
        };
        addMessage(activeContactId, voiceMessage);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMessage"])(voiceMessage);
        } catch  {
        // Keep optimistic UI behavior for local-first flow.
        }
    };
    const handleSendMessage = async (content)=>{
        if (!activeContactId || !activeContact) {
            return;
        }
        const normalizedContent = content.trim();
        if (!normalizedContent) {
            return;
        }
        const userMessage = {
            id: createMessageId('user'),
            contactId: activeContactId,
            role: 'user',
            content: normalizedContent,
            createdAt: new Date()
        };
        addMessage(activeContactId, userMessage);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMessage"])(userMessage);
        } catch  {
        // Keep optimistic UI behavior for local-first flow.
        }
        setIsLoading(true);
        let payload = null;
        const toolsPayload = buildChatToolsPayload(isFeishuToolEnabled, feishuMode);
        try {
            const requestPayload = {
                contact: activeContact,
                messages: [
                    ...currentMessages,
                    userMessage
                ].filter((message)=>message.content.trim().length > 0).map((message)=>({
                        role: message.role,
                        content: message.content
                    })),
                tools: toolsPayload
            };
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(()=>null);
                console.error('[chat-page] /api/chat request failed', {
                    status: response.status,
                    statusText: response.statusText,
                    requestId: errorBody?.requestId,
                    error: errorBody?.error,
                    contactId: activeContact.id,
                    messageCount: requestPayload.messages.length,
                    enabledTools: requestPayload.tools.enabled,
                    feishuMode: requestPayload.tools.feishuTemplateMessage?.mode
                });
                throw new Error(errorBody?.error ?? '聊天服务请求失败');
            }
            payload = await response.json();
            console.info('[chat-page] /api/chat request succeeded', {
                requestId: payload.requestId,
                contactId: activeContact.id,
                messageCount: requestPayload.messages.length,
                hasToolResult: Boolean(payload.toolResult)
            });
        } catch (error) {
            console.error('[chat-page] failed to send message', {
                contactId: activeContact.id,
                error: error instanceof Error ? error.message : String(error)
            });
            const fallbackMessage = {
                id: createMessageId('assistant-error'),
                contactId: activeContactId,
                role: 'assistant',
                content: '当前 AI 服务不可用，请检查本地代理配置后重试。',
                createdAt: new Date()
            };
            addMessage(activeContactId, fallbackMessage);
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMessage"])(fallbackMessage);
            } catch  {
            // Keep optimistic UI behavior for local-first flow.
            }
            setIsLoading(false);
            return;
        }
        if (payload.toolResult) {
            const normalizedCard = payload.contactCard ? {
                ...payload.contactCard,
                createdAt: new Date(payload.contactCard.createdAt)
            } : undefined;
            const toolMessage = {
                id: createMessageId('assistant-tool'),
                contactId: activeContactId,
                role: 'assistant',
                content: '',
                toolCalls: [
                    {
                        id: createMessageId('extract-contact'),
                        name: 'extract_contact_info',
                        arguments: {},
                        result: payload.toolResult
                    }
                ],
                contactCard: normalizedCard,
                pendingContactCardConfirmation: Boolean(normalizedCard),
                createdAt: new Date()
            };
            addMessage(activeContactId, toolMessage);
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMessage"])(toolMessage);
            } catch  {
            // Keep optimistic UI behavior for local-first flow.
            }
        }
        const assistantMessage = {
            id: createMessageId('assistant'),
            contactId: activeContactId,
            role: 'assistant',
            content: payload.reply || '我已经记下来了。',
            createdAt: new Date()
        };
        addMessage(activeContactId, assistantMessage);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$lib$2f$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveMessage"])(assistantMessage);
        } catch  {
        // Keep optimistic UI behavior for local-first flow.
        }
        setIsLoading(false);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex h-screen w-full flex-col bg-[#F5F5F7]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$drawer$2f$ContactsDrawer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ContactsDrawer"], {
                onAddContact: handleAddContact
            }, void 0, false, {
                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                lineNumber: 440,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "flex flex-1 flex-col",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$ChatHeader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChatHeader"], {
                        contact: activeContact
                    }, void 0, false, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                        lineNumber: 443,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$MessageList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessageList"], {
                        messages: currentMessages,
                        onConfirmContactCard: handleConfirmContactCard,
                        onDismissContactCard: handleDismissContactCard
                    }, void 0, false, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                        lineNumber: 445,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: messagesEndRef
                    }, void 0, false, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                        lineNumber: 450,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2 text-xs text-gray-600",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        checked: isFeishuToolEnabled,
                                        onChange: (event)=>setIsFeishuToolEnabled(event.target.checked),
                                        disabled: isLoading
                                    }, void 0, false, {
                                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                                        lineNumber: 454,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "开启飞书多维表工具"
                                    }, void 0, false, {
                                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                                        lineNumber: 460,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                                lineNumber: 453,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "模式"
                                    }, void 0, false, {
                                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                                        lineNumber: 463,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: feishuMode,
                                        onChange: (event)=>setFeishuMode(event.target.value),
                                        disabled: !isFeishuToolEnabled || isLoading,
                                        className: "rounded border border-gray-300 bg-white px-2 py-1 text-xs",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "sync",
                                                children: "sync"
                                            }, void 0, false, {
                                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                                                lineNumber: 470,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "preview",
                                                children: "preview"
                                            }, void 0, false, {
                                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                                                lineNumber: 471,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                                        lineNumber: 464,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                                lineNumber: 462,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                        lineNumber: 452,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$components$2f$chat$2f$ChatComposer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChatComposer"], {
                        onSendMessage: handleSendMessage,
                        onToolAction: handleToolAction,
                        onVoiceInput: handleVoiceInput,
                        disabled: isLoading
                    }, void 0, false, {
                        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                        lineNumber: 476,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
                lineNumber: 442,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/OnePersonCompany/friendsAI/packages/client/app/chat/page.tsx",
        lineNumber: 439,
        columnNumber: 5
    }, this);
}
_s(ChatPage, "VJDoMwvcZZhu7tot99oVqNrwX4c=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$stores$2f$chat$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = ChatPage;
var _c;
__turbopack_context__.k.register(_c, "ChatPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=OnePersonCompany_friendsAI_packages_client_5e43108a._.js.map