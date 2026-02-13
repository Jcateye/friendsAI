(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/internal.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
;
;
;
;
;
;
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
 //# sourceMappingURL=internal.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/remote-thread-list/BaseSubscribable.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BaseSubscribable",
    ()=>BaseSubscribable
]);
class BaseSubscribable {
    _subscribers = new Set();
    subscribe(callback) {
        this._subscribers.add(callback);
        return ()=>this._subscribers.delete(callback);
    }
    waitForUpdate() {
        return new Promise((resolve)=>{
            const unsubscribe = this.subscribe(()=>{
                unsubscribe();
                resolve();
            });
        });
    }
    _notifySubscribers() {
        const errors = [];
        for (const callback of this._subscribers){
            try {
                callback();
            } catch (error) {
                errors.push(error);
            }
        }
        if (errors.length > 0) {
            if (errors.length === 1) {
                throw errors[0];
            } else {
                for (const error of errors){
                    console.error(error);
                }
                throw new AggregateError(errors);
            }
        }
    }
} //# sourceMappingURL=BaseSubscribable.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/composer/BaseComposerRuntimeCore.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BaseComposerRuntimeCore",
    ()=>BaseComposerRuntimeCore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$remote$2d$thread$2d$list$2f$BaseSubscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/remote-thread-list/BaseSubscribable.js [app-client] (ecmascript)");
;
const isAttachmentComplete = (a)=>a.status.type === "complete";
class BaseComposerRuntimeCore extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$remote$2d$thread$2d$list$2f$BaseSubscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BaseSubscribable"] {
    isEditing = true;
    get attachmentAccept() {
        return this.getAttachmentAdapter()?.accept ?? "*";
    }
    _attachments = [];
    get attachments() {
        return this._attachments;
    }
    setAttachments(value) {
        this._attachments = value;
        this._notifySubscribers();
    }
    get isEmpty() {
        return !this.text.trim() && !this.attachments.length;
    }
    _text = "";
    get text() {
        return this._text;
    }
    _role = "user";
    get role() {
        return this._role;
    }
    _runConfig = {};
    get runConfig() {
        return this._runConfig;
    }
    setText(value) {
        if (this._text === value) return;
        this._text = value;
        // When dictation is active and the user manually edits the composer text,
        // treat the new text as the updated base so speech results are appended
        // instead of overwriting manual edits.
        if (this._dictation) {
            this._dictationBaseText = value;
            this._currentInterimText = "";
            const { status, inputDisabled } = this._dictation;
            this._dictation = inputDisabled ? {
                status,
                inputDisabled
            } : {
                status
            };
        }
        this._notifySubscribers();
    }
    setRole(role) {
        if (this._role === role) return;
        this._role = role;
        this._notifySubscribers();
    }
    setRunConfig(runConfig) {
        if (this._runConfig === runConfig) return;
        this._runConfig = runConfig;
        this._notifySubscribers();
    }
    _emptyTextAndAttachments() {
        this._attachments = [];
        this._text = "";
        this._notifySubscribers();
    }
    async _onClearAttachments() {
        const adapter = this.getAttachmentAdapter();
        if (adapter) {
            await Promise.all(this._attachments.map((a)=>adapter.remove(a)));
        }
    }
    async reset() {
        if (this._attachments.length === 0 && this._text === "" && this._role === "user" && Object.keys(this._runConfig).length === 0) {
            return;
        }
        this._role = "user";
        this._runConfig = {};
        const task = this._onClearAttachments();
        this._emptyTextAndAttachments();
        await task;
    }
    async clearAttachments() {
        const task = this._onClearAttachments();
        this.setAttachments([]);
        await task;
    }
    async send() {
        if (this._dictationSession) {
            this._dictationSession.cancel();
            this._cleanupDictation();
        }
        const adapter = this.getAttachmentAdapter();
        const attachments = adapter && this.attachments.length > 0 ? Promise.all(this.attachments.map(async (a)=>{
            if (isAttachmentComplete(a)) return a;
            const result = await adapter.send(a);
            return result;
        })) : [];
        const text = this.text;
        this._emptyTextAndAttachments();
        const message = {
            createdAt: new Date(),
            role: this.role,
            content: text ? [
                {
                    type: "text",
                    text
                }
            ] : [],
            attachments: await attachments,
            runConfig: this.runConfig,
            metadata: {
                custom: {}
            }
        };
        this.handleSend(message);
        this._notifyEventSubscribers("send");
    }
    cancel() {
        this.handleCancel();
    }
    async addAttachment(file) {
        const adapter = this.getAttachmentAdapter();
        if (!adapter) throw new Error("Attachments are not supported");
        const upsertAttachment = (a)=>{
            const idx = this._attachments.findIndex((attachment)=>attachment.id === a.id);
            if (idx !== -1) this._attachments = [
                ...this._attachments.slice(0, idx),
                a,
                ...this._attachments.slice(idx + 1)
            ];
            else {
                this._attachments = [
                    ...this._attachments,
                    a
                ];
            }
            this._notifySubscribers();
        };
        const promiseOrGenerator = adapter.add({
            file
        });
        if (Symbol.asyncIterator in promiseOrGenerator) {
            for await (const r of promiseOrGenerator){
                upsertAttachment(r);
            }
        } else {
            upsertAttachment(await promiseOrGenerator);
        }
        this._notifyEventSubscribers("attachmentAdd");
        this._notifySubscribers();
    }
    async removeAttachment(attachmentId) {
        const adapter = this.getAttachmentAdapter();
        if (!adapter) throw new Error("Attachments are not supported");
        const index = this._attachments.findIndex((a)=>a.id === attachmentId);
        if (index === -1) throw new Error("Attachment not found");
        const attachment = this._attachments[index];
        await adapter.remove(attachment);
        // this._attachments.toSpliced(index, 1); - not yet widely supported
        this._attachments = [
            ...this._attachments.slice(0, index),
            ...this._attachments.slice(index + 1)
        ];
        this._notifySubscribers();
    }
    _dictation;
    _dictationSession;
    _dictationUnsubscribes = [];
    _dictationBaseText = "";
    _currentInterimText = "";
    _dictationSessionIdCounter = 0;
    _activeDictationSessionId;
    _isCleaningDictation = false;
    get dictation() {
        return this._dictation;
    }
    _isActiveSession(sessionId, session) {
        return this._activeDictationSessionId === sessionId && this._dictationSession === session;
    }
    startDictation() {
        const adapter = this.getDictationAdapter();
        if (!adapter) {
            throw new Error("Dictation adapter not configured");
        }
        if (this._dictationSession) {
            for (const unsub of this._dictationUnsubscribes){
                unsub();
            }
            this._dictationUnsubscribes = [];
            const oldSession = this._dictationSession;
            oldSession.stop().catch(()=>{});
            this._dictationSession = undefined;
        }
        const inputDisabled = adapter.disableInputDuringDictation ?? false;
        this._dictationBaseText = this._text;
        this._currentInterimText = "";
        const session = adapter.listen();
        this._dictationSession = session;
        const sessionId = ++this._dictationSessionIdCounter;
        this._activeDictationSessionId = sessionId;
        this._dictation = {
            status: session.status,
            inputDisabled
        };
        this._notifySubscribers();
        const unsubSpeech = session.onSpeech((result)=>{
            if (!this._isActiveSession(sessionId, session)) return;
            const isFinal = result.isFinal !== false;
            const needsSeparator = this._dictationBaseText && !this._dictationBaseText.endsWith(" ") && result.transcript;
            const separator = needsSeparator ? " " : "";
            if (isFinal) {
                this._dictationBaseText = this._dictationBaseText + separator + result.transcript;
                this._currentInterimText = "";
                this._text = this._dictationBaseText;
                if (this._dictation) {
                    const { transcript: _, ...rest } = this._dictation;
                    this._dictation = rest;
                }
                this._notifySubscribers();
            } else {
                this._currentInterimText = separator + result.transcript;
                this._text = this._dictationBaseText + this._currentInterimText;
                if (this._dictation) {
                    this._dictation = {
                        ...this._dictation,
                        transcript: result.transcript
                    };
                }
                this._notifySubscribers();
            }
        });
        this._dictationUnsubscribes.push(unsubSpeech);
        const unsubStart = session.onSpeechStart(()=>{
            if (!this._isActiveSession(sessionId, session)) return;
            this._dictation = {
                status: {
                    type: "running"
                },
                inputDisabled,
                ...this._dictation?.transcript && {
                    transcript: this._dictation.transcript
                }
            };
            this._notifySubscribers();
        });
        this._dictationUnsubscribes.push(unsubStart);
        const unsubEnd = session.onSpeechEnd(()=>{
            this._cleanupDictation({
                sessionId
            });
        });
        this._dictationUnsubscribes.push(unsubEnd);
        const statusInterval = setInterval(()=>{
            if (!this._isActiveSession(sessionId, session)) return;
            if (session.status.type === "ended") {
                this._cleanupDictation({
                    sessionId
                });
            }
        }, 100);
        this._dictationUnsubscribes.push(()=>clearInterval(statusInterval));
    }
    stopDictation() {
        if (!this._dictationSession) return;
        const session = this._dictationSession;
        const sessionId = this._activeDictationSessionId;
        session.stop().finally(()=>{
            this._cleanupDictation({
                sessionId
            });
        });
    }
    _cleanupDictation(options) {
        const isStaleSession = options?.sessionId !== undefined && options.sessionId !== this._activeDictationSessionId;
        if (isStaleSession || this._isCleaningDictation) return;
        this._isCleaningDictation = true;
        try {
            for (const unsub of this._dictationUnsubscribes){
                unsub();
            }
            this._dictationUnsubscribes = [];
            this._dictationSession = undefined;
            this._activeDictationSessionId = undefined;
            this._dictation = undefined;
            this._dictationBaseText = "";
            this._currentInterimText = "";
            this._notifySubscribers();
        } finally{
            this._isCleaningDictation = false;
        }
    }
    _eventSubscribers = new Map();
    _notifyEventSubscribers(event) {
        const subscribers = this._eventSubscribers.get(event);
        if (!subscribers) return;
        for (const callback of subscribers)callback();
    }
    unstable_on(event, callback) {
        const subscribers = this._eventSubscribers.get(event);
        if (!subscribers) {
            this._eventSubscribers.set(event, new Set([
                callback
            ]));
        } else {
            subscribers.add(callback);
        }
        return ()=>{
            const subscribers = this._eventSubscribers.get(event);
            if (!subscribers) return;
            subscribers.delete(callback);
        };
    }
} //# sourceMappingURL=BaseComposerRuntimeCore.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/composer/DefaultThreadComposerRuntimeCore.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DefaultThreadComposerRuntimeCore",
    ()=>DefaultThreadComposerRuntimeCore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$composer$2f$BaseComposerRuntimeCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/composer/BaseComposerRuntimeCore.js [app-client] (ecmascript)");
;
class DefaultThreadComposerRuntimeCore extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$composer$2f$BaseComposerRuntimeCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BaseComposerRuntimeCore"] {
    runtime;
    _canCancel = false;
    get canCancel() {
        return this._canCancel;
    }
    get attachments() {
        return super.attachments;
    }
    getAttachmentAdapter() {
        return this.runtime.adapters?.attachments;
    }
    getDictationAdapter() {
        return this.runtime.adapters?.dictation;
    }
    constructor(runtime){
        super();
        this.runtime = runtime;
        this.connect();
    }
    connect() {
        return this.runtime.subscribe(()=>{
            if (this.canCancel !== this.runtime.capabilities.cancel) {
                this._canCancel = this.runtime.capabilities.cancel;
                this._notifySubscribers();
            }
        });
    }
    async handleSend(message) {
        this.runtime.append({
            ...message,
            parentId: this.runtime.messages.at(-1)?.id ?? null,
            sourceId: null
        });
    }
    async handleCancel() {
        this.runtime.cancelRun();
    }
} //# sourceMappingURL=DefaultThreadComposerRuntimeCore.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/model-context/ModelContextTypes.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mergeModelContexts",
    ()=>mergeModelContexts
]);
const mergeModelContexts = (configSet)=>{
    const configs = Array.from(configSet).map((c)=>c.getModelContext()).sort((a, b)=>(b.priority ?? 0) - (a.priority ?? 0));
    return configs.reduce((acc, config)=>{
        if (config.system) {
            if (acc.system) {
                // TODO should the separator be configurable?
                acc.system += `\n\n${config.system}`;
            } else {
                acc.system = config.system;
            }
        }
        if (config.tools) {
            for (const [name, tool] of Object.entries(config.tools)){
                const existing = acc.tools?.[name];
                if (existing && existing !== tool) {
                    throw new Error(`You tried to define a tool with the name ${name}, but it already exists.`);
                }
                if (!acc.tools) acc.tools = {};
                acc.tools[name] = tool;
            }
        }
        if (config.config) {
            acc.config = {
                ...acc.config,
                ...config.config
            };
        }
        if (config.callSettings) {
            acc.callSettings = {
                ...acc.callSettings,
                ...config.callSettings
            };
        }
        return acc;
    }, {});
}; //# sourceMappingURL=ModelContextTypes.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/CompositeContextProvider.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CompositeContextProvider",
    ()=>CompositeContextProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$model$2d$context$2f$ModelContextTypes$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/model-context/ModelContextTypes.js [app-client] (ecmascript)");
;
class CompositeContextProvider {
    _providers = new Set();
    getModelContext() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$model$2d$context$2f$ModelContextTypes$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mergeModelContexts"])(this._providers);
    }
    registerModelContextProvider(provider) {
        this._providers.add(provider);
        const unsubscribe = provider.subscribe?.(()=>{
            this.notifySubscribers();
        });
        this.notifySubscribers();
        return ()=>{
            this._providers.delete(provider);
            unsubscribe?.();
            this.notifySubscribers();
        };
    }
    _subscribers = new Set();
    notifySubscribers() {
        for (const callback of this._subscribers)callback();
    }
    subscribe(callback) {
        this._subscribers.add(callback);
        return ()=>this._subscribers.delete(callback);
    }
} //# sourceMappingURL=CompositeContextProvider.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/idUtils.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateErrorMessageId",
    ()=>generateErrorMessageId,
    "generateId",
    ()=>generateId,
    "generateOptimisticId",
    ()=>generateOptimisticId,
    "isErrorMessageId",
    ()=>isErrorMessageId,
    "isOptimisticId",
    ()=>isOptimisticId
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$nanoid$2f$non$2d$secure$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/nanoid/non-secure/index.js [app-client] (ecmascript)");
;
const generateId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$nanoid$2f$non$2d$secure$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["customAlphabet"])("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 7);
const optimisticPrefix = "__optimistic__";
const generateOptimisticId = ()=>`${optimisticPrefix}${generateId()}`;
const isOptimisticId = (id)=>id.startsWith(optimisticPrefix);
const errorPrefix = "__error__";
const generateErrorMessageId = ()=>`${errorPrefix}${generateId()}`;
const isErrorMessageId = (id)=>id.startsWith(errorPrefix); //# sourceMappingURL=idUtils.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/auto-status.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAutoStatus",
    ()=>getAutoStatus,
    "isAutoStatus",
    ()=>isAutoStatus
]);
const symbolAutoStatus = Symbol("autoStatus");
const AUTO_STATUS_RUNNING = Object.freeze(Object.assign({
    type: "running"
}, {
    [symbolAutoStatus]: true
}));
const AUTO_STATUS_COMPLETE = Object.freeze(Object.assign({
    type: "complete",
    reason: "unknown"
}, {
    [symbolAutoStatus]: true
}));
const AUTO_STATUS_PENDING = Object.freeze(Object.assign({
    type: "requires-action",
    reason: "tool-calls"
}, {
    [symbolAutoStatus]: true
}));
const AUTO_STATUS_INTERRUPT = Object.freeze(Object.assign({
    type: "requires-action",
    reason: "interrupt"
}, {
    [symbolAutoStatus]: true
}));
const isAutoStatus = (status)=>status[symbolAutoStatus] === true;
const getAutoStatus = (isLast, isRunning, hasInterruptedToolCalls, hasPendingToolCalls, error)=>{
    if (isLast && error) {
        return Object.assign({
            type: "incomplete",
            reason: "error",
            error: error
        }, {
            [symbolAutoStatus]: true
        });
    }
    return isLast && isRunning ? AUTO_STATUS_RUNNING : hasInterruptedToolCalls ? AUTO_STATUS_INTERRUPT : hasPendingToolCalls ? AUTO_STATUS_PENDING : AUTO_STATUS_COMPLETE;
}; //# sourceMappingURL=auto-status.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/ThreadMessageLike.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fromThreadMessageLike",
    ()=>fromThreadMessageLike
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/json/parse-partial-json-object.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$idUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/idUtils.js [app-client] (ecmascript)");
;
;
const fromThreadMessageLike = (like, fallbackId, fallbackStatus)=>{
    const { role, id, createdAt, attachments, status, metadata } = like;
    const common = {
        id: id ?? fallbackId,
        createdAt: createdAt ?? new Date()
    };
    const content = typeof like.content === "string" ? [
        {
            type: "text",
            text: like.content
        }
    ] : like.content;
    const sanitizeImageContent = ({ image, ...rest })=>{
        const match = image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.*)$/);
        if (match) {
            return {
                ...rest,
                image
            };
        }
        console.warn(`Invalid image data format detected`);
        return null;
    };
    if (role !== "user" && attachments?.length) throw new Error("attachments are only supported for user messages");
    if (role !== "assistant" && status) throw new Error("status is only supported for assistant messages");
    if (role !== "assistant" && metadata?.steps) throw new Error("metadata.steps is only supported for assistant messages");
    switch(role){
        case "assistant":
            return {
                ...common,
                role,
                content: content.map((part)=>{
                    const type = part.type;
                    switch(type){
                        case "text":
                        case "reasoning":
                            if (part.text.trim().length === 0) return null;
                            return part;
                        case "file":
                        case "source":
                            return part;
                        case "image":
                            return sanitizeImageContent(part);
                        case "data":
                            return part;
                        case "tool-call":
                            {
                                const { parentId, messages, ...basePart } = part;
                                const commonProps = {
                                    ...basePart,
                                    toolCallId: part.toolCallId ?? `tool-${(0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$idUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateId"])()}`,
                                    ...parentId !== undefined && {
                                        parentId
                                    },
                                    ...messages !== undefined && {
                                        messages
                                    }
                                };
                                if (part.args) {
                                    return {
                                        ...commonProps,
                                        args: part.args,
                                        argsText: part.argsText ?? JSON.stringify(part.args)
                                    };
                                }
                                return {
                                    ...commonProps,
                                    args: (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parsePartialJsonObject"])(part.argsText ?? "") ?? {},
                                    argsText: part.argsText ?? ""
                                };
                            }
                        default:
                            {
                                const unhandledType = type;
                                throw new Error(`Unsupported assistant message part type: ${unhandledType}`);
                            }
                    }
                }).filter((c)=>!!c),
                status: status ?? fallbackStatus,
                metadata: {
                    unstable_state: metadata?.unstable_state ?? null,
                    unstable_annotations: metadata?.unstable_annotations ?? [],
                    unstable_data: metadata?.unstable_data ?? [],
                    custom: metadata?.custom ?? {},
                    steps: metadata?.steps ?? [],
                    ...metadata?.submittedFeedback && {
                        submittedFeedback: metadata.submittedFeedback
                    }
                }
            };
        case "user":
            return {
                ...common,
                role,
                content: content.map((part)=>{
                    const type = part.type;
                    switch(type){
                        case "text":
                        case "image":
                        case "audio":
                        case "file":
                            return part;
                        default:
                            {
                                const unhandledType = type;
                                throw new Error(`Unsupported user message part type: ${unhandledType}`);
                            }
                    }
                }),
                attachments: attachments ?? [],
                metadata: {
                    custom: metadata?.custom ?? {}
                }
            };
        case "system":
            if (content.length !== 1 || content[0].type !== "text") throw new Error("System messages must have exactly one text message part.");
            return {
                ...common,
                role,
                content: content,
                metadata: {
                    custom: metadata?.custom ?? {}
                }
            };
        default:
            {
                const unsupportedRole = role;
                throw new Error(`Unknown message role: ${unsupportedRole}`);
            }
    }
}; //# sourceMappingURL=ThreadMessageLike.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/utils/MessageRepository.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExportedMessageRepository",
    ()=>ExportedMessageRepository,
    "MessageRepository",
    ()=>MessageRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$idUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/idUtils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$auto$2d$status$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/auto-status.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$ThreadMessageLike$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/ThreadMessageLike.js [app-client] (ecmascript)");
;
;
;
const ExportedMessageRepository = {
    /**
     * Converts an array of messages to an ExportedMessageRepository format.
     * Creates parent-child relationships based on the order of messages in the array.
     *
     * @param messages - Array of message-like objects to convert
     * @returns ExportedMessageRepository with parent-child relationships established
     */ fromArray: (messages)=>{
        const conv = messages.map((m)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$ThreadMessageLike$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fromThreadMessageLike"])(m, (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$idUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateId"])(), (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$auto$2d$status$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAutoStatus"])(false, false, false, false, undefined)));
        return {
            messages: conv.map((m, idx)=>({
                    parentId: idx > 0 ? conv[idx - 1].id : null,
                    message: m
                }))
        };
    }
};
/**
 * Recursively finds the head (leaf) message in a branch.
 *
 * @param message - The starting message or parent node
 * @returns The leaf message of the branch, or null if not found
 */ const findHead = (message)=>{
    if (message.next) return findHead(message.next);
    if ("current" in message) return message;
    return null;
};
/**
 * A utility class for caching computed values and invalidating the cache when needed.
 */ class CachedValue {
    func;
    _value = null;
    /**
     * @param func - The function that computes the cached value
     */ constructor(func){
        this.func = func;
    }
    /**
     * Gets the cached value, computing it if necessary.
     */ get value() {
        if (this._value === null) {
            this._value = this.func();
        }
        return this._value;
    }
    /**
     * Invalidates the cache, forcing recomputation on next access.
     */ dirty() {
        this._value = null;
    }
}
class MessageRepository {
    /** Map of message IDs to repository message objects */ messages = new Map();
    /** Reference to the current head (most recent) message in the active branch */ head = null;
    /** Root node of the tree structure */ root = {
        children: [],
        next: null
    };
    /**
     * Recursively updates the level of a message and all its descendants.
     *
     * @param message - The message to update
     * @param newLevel - The new level for the message
     */ updateLevels(message, newLevel) {
        message.level = newLevel;
        for (const childId of message.children){
            const childMessage = this.messages.get(childId);
            if (childMessage) {
                this.updateLevels(childMessage, newLevel + 1);
            }
        }
    }
    /**
     * Performs link/unlink operations between messages in the tree.
     *
     * @param newParent - The new parent message, or null
     * @param child - The child message to operate on
     * @param operation - The type of operation to perform:
     *   - "cut": Remove the child from its current parent
     *   - "link": Add the child to a new parent
     *   - "relink": Both cut and link operations
     */ performOp(newParent, child, operation) {
        const parentOrRoot = child.prev ?? this.root;
        const newParentOrRoot = newParent ?? this.root;
        if (operation === "relink" && parentOrRoot === newParentOrRoot) return;
        // cut
        if (operation !== "link") {
            // remove from parentOrRoot.children
            parentOrRoot.children = parentOrRoot.children.filter((m)=>m !== child.current.id);
            // update parentOrRoot.next
            if (parentOrRoot.next === child) {
                const fallbackId = parentOrRoot.children.at(-1);
                const fallback = fallbackId ? this.messages.get(fallbackId) : null;
                if (fallback === undefined) {
                    throw new Error("MessageRepository(performOp/cut): Fallback sibling message not found. This is likely an internal bug in assistant-ui.");
                }
                parentOrRoot.next = fallback;
            }
        }
        // link
        if (operation !== "cut") {
            // ensure the child is not part of parent tree
            for(let current = newParent; current; current = current.prev){
                if (current.current.id === child.current.id) {
                    throw new Error("MessageRepository(performOp/link): A message with the same id already exists in the parent tree. This error occurs if the same message id is found multiple times. This is likely an internal bug in assistant-ui.");
                }
            }
            // add to parentOrRoot.children
            newParentOrRoot.children = [
                ...newParentOrRoot.children,
                child.current.id
            ];
            // update parentOrRoot.next
            if (findHead(child) === this.head || newParentOrRoot.next === null) {
                newParentOrRoot.next = child;
            }
            child.prev = newParent;
            // update levels when linking/relinking to a new parent
            const newLevel = newParent ? newParent.level + 1 : 0;
            this.updateLevels(child, newLevel);
        }
    }
    /** Cached array of messages in the current active branch, from root to head */ _messages = new CachedValue(()=>{
        const messages = new Array((this.head?.level ?? -1) + 1);
        for(let current = this.head; current; current = current.prev){
            messages[current.level] = current.current;
        }
        return messages;
    });
    /**
     * Gets the ID of the current head message.
     * @returns The ID of the head message, or null if no messages exist
     */ get headId() {
        return this.head?.current.id ?? null;
    }
    /**
     * Gets all messages in the current active branch, from root to head.
     * @param headId - Optional ID of the head message to get messages for. If not provided, uses the current head.
     * @returns Array of messages in the specified branch
     */ getMessages(headId) {
        if (headId === undefined || headId === this.head?.current.id) {
            return this._messages.value;
        }
        const headMessage = this.messages.get(headId);
        if (!headMessage) {
            throw new Error("MessageRepository(getMessages): Head message not found. This is likely an internal bug in assistant-ui.");
        }
        const messages = new Array(headMessage.level + 1);
        for(let current = headMessage; current; current = current.prev){
            messages[current.level] = current.current;
        }
        return messages;
    }
    /**
     * Adds a new message or updates an existing one in the repository.
     * If the message ID already exists, the message is updated and potentially relinked to a new parent.
     * If the message is new, it's added as a child of the specified parent.
     *
     * @param parentId - ID of the parent message, or null for root messages
     * @param message - The message to add or update
     * @throws Error if the parent message is not found
     */ addOrUpdateMessage(parentId, message) {
        const existingItem = this.messages.get(message.id);
        const prev = parentId ? this.messages.get(parentId) : null;
        if (prev === undefined) throw new Error("MessageRepository(addOrUpdateMessage): Parent message not found. This is likely an internal bug in assistant-ui.");
        // update existing message
        if (existingItem) {
            existingItem.current = message;
            this.performOp(prev, existingItem, "relink");
            this._messages.dirty();
            return;
        }
        // create a new message
        const newItem = {
            prev,
            current: message,
            next: null,
            children: [],
            level: prev ? prev.level + 1 : 0
        };
        this.messages.set(message.id, newItem);
        this.performOp(prev, newItem, "link");
        if (this.head === prev) {
            this.head = newItem;
        }
        this._messages.dirty();
    }
    /**
     * Gets a message and its parent ID by message ID.
     *
     * @param messageId - ID of the message to retrieve
     * @returns Object containing the message and its parent ID
     * @throws Error if the message is not found
     */ getMessage(messageId) {
        const message = this.messages.get(messageId);
        if (!message) throw new Error("MessageRepository(updateMessage): Message not found. This is likely an internal bug in assistant-ui.");
        return {
            parentId: message.prev?.current.id ?? null,
            message: message.current,
            index: message.level
        };
    }
    /**
     * Adds an optimistic message to the repository.
     * An optimistic message is a temporary placeholder that will be replaced by a real message later.
     *
     * @param parentId - ID of the parent message, or null for root messages
     * @param message - The core message to convert to an optimistic message
     * @returns The generated optimistic ID
     */ appendOptimisticMessage(parentId, message) {
        let optimisticId;
        do {
            optimisticId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$idUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateOptimisticId"])();
        }while (this.messages.has(optimisticId))
        this.addOrUpdateMessage(parentId, (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$ThreadMessageLike$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fromThreadMessageLike"])(message, optimisticId, {
            type: "running"
        }));
        return optimisticId;
    }
    /**
     * Deletes a message from the repository and relinks its children.
     *
     * @param messageId - ID of the message to delete
     * @param replacementId - Optional ID of the message to become the new parent of the children,
     *                       undefined means use the deleted message's parent,
     *                       null means use the root
     * @throws Error if the message or replacement is not found
     */ deleteMessage(messageId, replacementId) {
        const message = this.messages.get(messageId);
        if (!message) throw new Error("MessageRepository(deleteMessage): Message not found. This is likely an internal bug in assistant-ui.");
        const replacement = replacementId === undefined ? message.prev // if no replacementId is provided, use the parent
         : replacementId === null ? null : this.messages.get(replacementId);
        if (replacement === undefined) throw new Error("MessageRepository(deleteMessage): Replacement not found. This is likely an internal bug in assistant-ui.");
        for (const child of message.children){
            const childMessage = this.messages.get(child);
            if (!childMessage) throw new Error("MessageRepository(deleteMessage): Child message not found. This is likely an internal bug in assistant-ui.");
            this.performOp(replacement, childMessage, "relink");
        }
        this.performOp(null, message, "cut");
        this.messages.delete(messageId);
        if (this.head === message) {
            this.head = findHead(replacement ?? this.root);
        }
        this._messages.dirty();
    }
    /**
     * Gets all branch IDs (sibling messages) at the level of a specified message.
     *
     * @param messageId - ID of the message to find branches for
     * @returns Array of message IDs representing branches
     * @throws Error if the message is not found
     */ getBranches(messageId) {
        const message = this.messages.get(messageId);
        if (!message) throw new Error("MessageRepository(getBranches): Message not found. This is likely an internal bug in assistant-ui.");
        const { children } = message.prev ?? this.root;
        return children;
    }
    /**
     * Switches the active branch to the one containing the specified message.
     *
     * @param messageId - ID of the message in the branch to switch to
     * @throws Error if the branch is not found
     */ switchToBranch(messageId) {
        const message = this.messages.get(messageId);
        if (!message) throw new Error("MessageRepository(switchToBranch): Branch not found. This is likely an internal bug in assistant-ui.");
        const prevOrRoot = message.prev ?? this.root;
        prevOrRoot.next = message;
        this.head = findHead(message);
        this._messages.dirty();
    }
    /**
     * Resets the head to a specific message or null.
     *
     * @param messageId - ID of the message to set as head, or null to clear the head
     * @throws Error if the message is not found
     */ resetHead(messageId) {
        if (messageId === null) {
            this.clear();
            return;
        }
        const message = this.messages.get(messageId);
        if (!message) throw new Error("MessageRepository(resetHead): Branch not found. This is likely an internal bug in assistant-ui.");
        if (message.children.length > 0) {
            const deleteDescendants = (msg)=>{
                for (const childId of msg.children){
                    const childMessage = this.messages.get(childId);
                    if (childMessage) {
                        deleteDescendants(childMessage);
                        this.messages.delete(childId);
                    }
                }
            };
            deleteDescendants(message);
            message.children = [];
            message.next = null;
        }
        this.head = message;
        for(let current = message; current; current = current.prev){
            if (current.prev) {
                current.prev.next = current;
            }
        }
        this._messages.dirty();
    }
    /**
     * Clears all messages from the repository.
     */ clear() {
        this.messages.clear();
        this.head = null;
        this.root = {
            children: [],
            next: null
        };
        this._messages.dirty();
    }
    /**
     * Exports the repository state for persistence.
     *
     * @returns Exportable repository state
     */ export() {
        const exportItems = [];
        // hint: we are relying on the insertion order of the messages
        // this is important for the import function to properly link the messages
        for (const [, message] of this.messages){
            exportItems.push({
                message: message.current,
                parentId: message.prev?.current.id ?? null
            });
        }
        return {
            headId: this.head?.current.id ?? null,
            messages: exportItems
        };
    }
    /**
     * Imports repository state from an exported repository.
     *
     * @param repository - The exported repository state to import
     */ import({ headId, messages }) {
        for (const { message, parentId } of messages){
            this.addOrUpdateMessage(parentId, message);
        }
        // switch to the saved head id if it is not the most recent message
        this.resetHead(headId ?? messages.at(-1)?.message.id ?? null);
    }
} //# sourceMappingURL=MessageRepository.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/core/BaseAssistantRuntimeCore.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BaseAssistantRuntimeCore",
    ()=>BaseAssistantRuntimeCore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$CompositeContextProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/CompositeContextProvider.js [app-client] (ecmascript)");
;
class BaseAssistantRuntimeCore {
    _contextProvider = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$CompositeContextProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CompositeContextProvider"]();
    registerModelContextProvider(provider) {
        return this._contextProvider.registerModelContextProvider(provider);
    }
    getModelContextProvider() {
        return this._contextProvider;
    }
} //# sourceMappingURL=BaseAssistantRuntimeCore.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/BaseSubject.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BaseSubject",
    ()=>BaseSubject
]);
class BaseSubject {
    _subscriptions = new Set();
    _connection;
    get isConnected() {
        return !!this._connection;
    }
    notifySubscribers() {
        for (const callback of this._subscriptions)callback();
    }
    _updateConnection() {
        if (this._subscriptions.size > 0) {
            if (this._connection) return;
            this._connection = this._connect();
        } else {
            this._connection?.();
            this._connection = undefined;
        }
    }
    subscribe(callback) {
        this._subscriptions.add(callback);
        this._updateConnection();
        return ()=>{
            this._subscriptions.delete(callback);
            this._updateConnection();
        };
    }
} //# sourceMappingURL=BaseSubject.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/SKIP_UPDATE.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SKIP_UPDATE",
    ()=>SKIP_UPDATE
]);
const SKIP_UPDATE = Symbol("skip-update"); //# sourceMappingURL=SKIP_UPDATE.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/LazyMemoizeSubject.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LazyMemoizeSubject",
    ()=>LazyMemoizeSubject
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$BaseSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/BaseSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/SKIP_UPDATE.js [app-client] (ecmascript)");
;
;
class LazyMemoizeSubject extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$BaseSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BaseSubject"] {
    binding;
    get path() {
        return this.binding.path;
    }
    constructor(binding){
        super();
        this.binding = binding;
    }
    _previousStateDirty = true;
    _previousState;
    getState = ()=>{
        if (!this.isConnected || this._previousStateDirty) {
            const newState = this.binding.getState();
            if (newState !== __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"]) {
                this._previousState = newState;
            }
            this._previousStateDirty = false;
        }
        if (this._previousState === undefined) throw new Error("Entry not available in the store");
        return this._previousState;
    };
    _connect() {
        const callback = ()=>{
            this._previousStateDirty = true;
            this.notifySubscribers();
        };
        return this.binding.subscribe(callback);
    }
} //# sourceMappingURL=LazyMemoizeSubject.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadListItemRuntime.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThreadListItemRuntimeImpl",
    ()=>ThreadListItemRuntimeImpl
]);
class ThreadListItemRuntimeImpl {
    _core;
    _threadListBinding;
    get path() {
        return this._core.path;
    }
    constructor(_core, _threadListBinding){
        this._core = _core;
        this._threadListBinding = _threadListBinding;
        this.__internal_bindMethods();
    }
    __internal_bindMethods() {
        this.switchTo = this.switchTo.bind(this);
        this.rename = this.rename.bind(this);
        this.archive = this.archive.bind(this);
        this.unarchive = this.unarchive.bind(this);
        this.delete = this.delete.bind(this);
        this.initialize = this.initialize.bind(this);
        this.generateTitle = this.generateTitle.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unstable_on = this.unstable_on.bind(this);
        this.getState = this.getState.bind(this);
        this.detach = this.detach.bind(this);
    }
    getState() {
        return this._core.getState();
    }
    switchTo() {
        const state = this._core.getState();
        return this._threadListBinding.switchToThread(state.id);
    }
    rename(newTitle) {
        const state = this._core.getState();
        return this._threadListBinding.rename(state.id, newTitle);
    }
    archive() {
        const state = this._core.getState();
        return this._threadListBinding.archive(state.id);
    }
    unarchive() {
        const state = this._core.getState();
        return this._threadListBinding.unarchive(state.id);
    }
    delete() {
        const state = this._core.getState();
        return this._threadListBinding.delete(state.id);
    }
    initialize() {
        const state = this._core.getState();
        return this._threadListBinding.initialize(state.id);
    }
    generateTitle() {
        const state = this._core.getState();
        return this._threadListBinding.generateTitle(state.id);
    }
    unstable_on(event, callback) {
        // if the runtime is bound to a specific thread, trigger if isMain is toggled
        // if the runtime is bound to the main thread, trigger switchedTo if threadId changes
        let prevIsMain = this._core.getState().isMain;
        let prevThreadId = this._core.getState().id;
        return this.subscribe(()=>{
            const currentState = this._core.getState();
            const newIsMain = currentState.isMain;
            const newThreadId = currentState.id;
            if (prevIsMain === newIsMain && prevThreadId === newThreadId) return;
            prevIsMain = newIsMain;
            prevThreadId = newThreadId;
            if (event === "switchedTo" && !newIsMain) return;
            if (event === "switchedAway" && newIsMain) return;
            callback();
        });
    }
    subscribe(callback) {
        return this._core.subscribe(callback);
    }
    detach() {
        const state = this._core.getState();
        this._threadListBinding.detach(state.id);
    }
    /** @internal */ __internal_getRuntime() {
        return this;
    }
} //# sourceMappingURL=ThreadListItemRuntime.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/shallowEqual.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "shallowEqual",
    ()=>shallowEqual
]);
function shallowEqual(objA, objB) {
    if (objA === undefined && objB === undefined) return true;
    if (objA === undefined) return false;
    if (objB === undefined) return false;
    for (const key of Object.keys(objA)){
        const valueA = objA[key];
        const valueB = objB[key];
        if (!Object.is(valueA, valueB)) return false;
    }
    return true;
} //# sourceMappingURL=shallowEqual.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ShallowMemoizeSubject",
    ()=>ShallowMemoizeSubject
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$shallowEqual$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/shallowEqual.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$BaseSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/BaseSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/SKIP_UPDATE.js [app-client] (ecmascript)");
;
;
;
class ShallowMemoizeSubject extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$BaseSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BaseSubject"] {
    binding;
    get path() {
        return this.binding.path;
    }
    constructor(binding){
        super();
        this.binding = binding;
        const state = binding.getState();
        if (state === __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"]) throw new Error("Entry not available in the store");
        this._previousState = state;
    }
    _previousState;
    getState = ()=>{
        if (!this.isConnected) this._syncState();
        return this._previousState;
    };
    _syncState() {
        const state = this.binding.getState();
        if (state === __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"]) return false;
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$shallowEqual$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shallowEqual"])(state, this._previousState)) return false;
        this._previousState = state;
        return true;
    }
    _connect() {
        const callback = ()=>{
            if (this._syncState()) {
                this.notifySubscribers();
            }
        };
        return this.binding.subscribe(callback);
    }
} //# sourceMappingURL=ShallowMemoizeSubject.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/getExternalStoreMessage.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getExternalStoreMessage",
    ()=>getExternalStoreMessage,
    "getExternalStoreMessages",
    ()=>getExternalStoreMessages,
    "symbolInnerMessage",
    ()=>symbolInnerMessage
]);
const symbolInnerMessage = Symbol("innerMessage");
const symbolInnerMessages = Symbol("innerMessages");
const getExternalStoreMessage = (input)=>{
    const withInnerMessages = input;
    return withInnerMessages[symbolInnerMessage];
};
const EMPTY_ARRAY = [];
const getExternalStoreMessages = (input)=>{
    // TODO temp until 0.12.0 (migrate useExternalStoreRuntime to always set an array)
    const container = "messages" in input ? input.messages : input;
    const value = container[symbolInnerMessages] || container[symbolInnerMessage];
    if (!value) return EMPTY_ARRAY;
    if (Array.isArray(value)) {
        return value;
    }
    container[symbolInnerMessages] = [
        value
    ];
    return container[symbolInnerMessages];
}; //# sourceMappingURL=getExternalStoreMessage.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/getThreadMessageText.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getThreadMessageText",
    ()=>getThreadMessageText
]);
const getThreadMessageText = (message)=>{
    const textParts = message.content.filter((part)=>part.type === "text");
    return textParts.map((part)=>part.text).join("\n\n");
}; //# sourceMappingURL=getThreadMessageText.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/AttachmentRuntime.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AttachmentRuntimeImpl",
    ()=>AttachmentRuntimeImpl,
    "EditComposerAttachmentRuntimeImpl",
    ()=>EditComposerAttachmentRuntimeImpl,
    "MessageAttachmentRuntimeImpl",
    ()=>MessageAttachmentRuntimeImpl,
    "ThreadComposerAttachmentRuntimeImpl",
    ()=>ThreadComposerAttachmentRuntimeImpl
]);
class AttachmentRuntimeImpl {
    _core;
    get path() {
        return this._core.path;
    }
    constructor(_core){
        this._core = _core;
        this.__internal_bindMethods();
    }
    __internal_bindMethods() {
        this.getState = this.getState.bind(this);
        this.remove = this.remove.bind(this);
        this.subscribe = this.subscribe.bind(this);
    }
    getState() {
        return this._core.getState();
    }
    subscribe(callback) {
        return this._core.subscribe(callback);
    }
}
class ComposerAttachmentRuntime extends AttachmentRuntimeImpl {
    _composerApi;
    constructor(core, _composerApi){
        super(core);
        this._composerApi = _composerApi;
    }
    remove() {
        const core = this._composerApi.getState();
        if (!core) throw new Error("Composer is not available");
        return core.removeAttachment(this.getState().id);
    }
}
class ThreadComposerAttachmentRuntimeImpl extends ComposerAttachmentRuntime {
    get source() {
        return "thread-composer";
    }
}
class EditComposerAttachmentRuntimeImpl extends ComposerAttachmentRuntime {
    get source() {
        return "edit-composer";
    }
}
class MessageAttachmentRuntimeImpl extends AttachmentRuntimeImpl {
    get source() {
        return "message";
    }
    constructor(core){
        super(core);
    }
    remove() {
        throw new Error("Message attachments cannot be removed");
    }
} //# sourceMappingURL=AttachmentRuntime.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/EventSubscriptionSubject.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EventSubscriptionSubject",
    ()=>EventSubscriptionSubject
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$BaseSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/BaseSubject.js [app-client] (ecmascript)");
;
class EventSubscriptionSubject extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$BaseSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BaseSubject"] {
    config;
    constructor(config){
        super();
        this.config = config;
    }
    getState() {
        return this.config.binding.getState();
    }
    outerSubscribe(callback) {
        return this.config.binding.subscribe(callback);
    }
    _connect() {
        const callback = ()=>{
            this.notifySubscribers();
        };
        let lastState = this.config.binding.getState();
        let innerUnsubscribe = lastState?.unstable_on(this.config.event, callback);
        const onRuntimeUpdate = ()=>{
            const newState = this.config.binding.getState();
            if (newState === lastState) return;
            lastState = newState;
            innerUnsubscribe?.();
            innerUnsubscribe = this.config.binding.getState()?.unstable_on(this.config.event, callback);
        };
        const outerUnsubscribe = this.outerSubscribe(onRuntimeUpdate);
        return ()=>{
            outerUnsubscribe?.();
            innerUnsubscribe?.();
        };
    }
} //# sourceMappingURL=EventSubscriptionSubject.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ComposerRuntime.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ComposerRuntimeImpl",
    ()=>ComposerRuntimeImpl,
    "EditComposerRuntimeImpl",
    ()=>EditComposerRuntimeImpl,
    "ThreadComposerRuntimeImpl",
    ()=>ThreadComposerRuntimeImpl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$LazyMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/LazyMemoizeSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$AttachmentRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/AttachmentRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/SKIP_UPDATE.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$EventSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/EventSubscriptionSubject.js [app-client] (ecmascript)");
;
;
;
;
;
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});
const getThreadComposerState = (runtime)=>{
    return Object.freeze({
        type: "thread",
        isEditing: runtime?.isEditing ?? false,
        canCancel: runtime?.canCancel ?? false,
        isEmpty: runtime?.isEmpty ?? true,
        attachments: runtime?.attachments ?? EMPTY_ARRAY,
        text: runtime?.text ?? "",
        role: runtime?.role ?? "user",
        runConfig: runtime?.runConfig ?? EMPTY_OBJECT,
        attachmentAccept: runtime?.attachmentAccept ?? "",
        dictation: runtime?.dictation,
        value: runtime?.text ?? ""
    });
};
const getEditComposerState = (runtime)=>{
    return Object.freeze({
        type: "edit",
        isEditing: runtime?.isEditing ?? false,
        canCancel: runtime?.canCancel ?? false,
        isEmpty: runtime?.isEmpty ?? true,
        text: runtime?.text ?? "",
        role: runtime?.role ?? "user",
        attachments: runtime?.attachments ?? EMPTY_ARRAY,
        runConfig: runtime?.runConfig ?? EMPTY_OBJECT,
        attachmentAccept: runtime?.attachmentAccept ?? "",
        dictation: runtime?.dictation,
        value: runtime?.text ?? ""
    });
};
class ComposerRuntimeImpl {
    _core;
    get path() {
        return this._core.path;
    }
    constructor(_core){
        this._core = _core;
    }
    __internal_bindMethods() {
        this.setText = this.setText.bind(this);
        this.setRunConfig = this.setRunConfig.bind(this);
        this.getState = this.getState.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.addAttachment = this.addAttachment.bind(this);
        this.reset = this.reset.bind(this);
        this.clearAttachments = this.clearAttachments.bind(this);
        this.send = this.send.bind(this);
        this.cancel = this.cancel.bind(this);
        this.setRole = this.setRole.bind(this);
        this.getAttachmentByIndex = this.getAttachmentByIndex.bind(this);
        this.startDictation = this.startDictation.bind(this);
        this.stopDictation = this.stopDictation.bind(this);
        this.unstable_on = this.unstable_on.bind(this);
    }
    setText(text) {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        core.setText(text);
    }
    setRunConfig(runConfig) {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        core.setRunConfig(runConfig);
    }
    addAttachment(file) {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        return core.addAttachment(file);
    }
    reset() {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        return core.reset();
    }
    clearAttachments() {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        return core.clearAttachments();
    }
    send() {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        core.send();
    }
    cancel() {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        core.cancel();
    }
    setRole(role) {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        core.setRole(role);
    }
    startDictation() {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        core.startDictation();
    }
    stopDictation() {
        const core = this._core.getState();
        if (!core) throw new Error("Composer is not available");
        core.stopDictation();
    }
    subscribe(callback) {
        return this._core.subscribe(callback);
    }
    _eventSubscriptionSubjects = new Map();
    unstable_on(event, callback) {
        let subject = this._eventSubscriptionSubjects.get(event);
        if (!subject) {
            subject = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$EventSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EventSubscriptionSubject"]({
                event: event,
                binding: this._core
            });
            this._eventSubscriptionSubjects.set(event, subject);
        }
        return subject.subscribe(callback);
    }
}
class ThreadComposerRuntimeImpl extends ComposerRuntimeImpl {
    get path() {
        return this._core.path;
    }
    get type() {
        return "thread";
    }
    _getState;
    constructor(core){
        const stateBinding = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$LazyMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LazyMemoizeSubject"]({
            path: core.path,
            getState: ()=>getThreadComposerState(core.getState()),
            subscribe: (callback)=>core.subscribe(callback)
        });
        super({
            path: core.path,
            getState: ()=>core.getState(),
            subscribe: (callback)=>stateBinding.subscribe(callback)
        });
        this._getState = stateBinding.getState.bind(stateBinding);
        this.__internal_bindMethods();
    }
    getState() {
        return this._getState();
    }
    getAttachmentByIndex(idx) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$AttachmentRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThreadComposerAttachmentRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: {
                ...this.path,
                attachmentSource: "thread-composer",
                attachmentSelector: {
                    type: "index",
                    index: idx
                },
                ref: `${this.path.ref}.attachments[${idx}]`
            },
            getState: ()=>{
                const attachments = this.getState().attachments;
                const attachment = attachments[idx];
                if (!attachment) return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"];
                return {
                    ...attachment,
                    source: "thread-composer"
                };
            },
            subscribe: (callback)=>this._core.subscribe(callback)
        }), this._core);
    }
}
class EditComposerRuntimeImpl extends ComposerRuntimeImpl {
    _beginEdit;
    get path() {
        return this._core.path;
    }
    get type() {
        return "edit";
    }
    _getState;
    constructor(core, _beginEdit){
        const stateBinding = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$LazyMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LazyMemoizeSubject"]({
            path: core.path,
            getState: ()=>getEditComposerState(core.getState()),
            subscribe: (callback)=>core.subscribe(callback)
        });
        super({
            path: core.path,
            getState: ()=>core.getState(),
            subscribe: (callback)=>stateBinding.subscribe(callback)
        });
        this._beginEdit = _beginEdit;
        this._getState = stateBinding.getState.bind(stateBinding);
        this.__internal_bindMethods();
    }
    __internal_bindMethods() {
        super.__internal_bindMethods();
        this.beginEdit = this.beginEdit.bind(this);
    }
    getState() {
        return this._getState();
    }
    beginEdit() {
        this._beginEdit();
    }
    getAttachmentByIndex(idx) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$AttachmentRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EditComposerAttachmentRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: {
                ...this.path,
                attachmentSource: "edit-composer",
                attachmentSelector: {
                    type: "index",
                    index: idx
                },
                ref: `${this.path.ref}.attachments[${idx}]`
            },
            getState: ()=>{
                const attachments = this.getState().attachments;
                const attachment = attachments[idx];
                if (!attachment) return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"];
                return {
                    ...attachment,
                    source: "edit-composer"
                };
            },
            subscribe: (callback)=>this._core.subscribe(callback)
        }), this._core);
    }
} //# sourceMappingURL=ComposerRuntime.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/MessagePartRuntime.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessagePartRuntimeImpl",
    ()=>MessagePartRuntimeImpl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/ToolResponse.js [app-client] (ecmascript)");
;
class MessagePartRuntimeImpl {
    contentBinding;
    messageApi;
    threadApi;
    get path() {
        return this.contentBinding.path;
    }
    constructor(contentBinding, messageApi, threadApi){
        this.contentBinding = contentBinding;
        this.messageApi = messageApi;
        this.threadApi = threadApi;
        this.__internal_bindMethods();
    }
    __internal_bindMethods() {
        this.addToolResult = this.addToolResult.bind(this);
        this.resumeToolCall = this.resumeToolCall.bind(this);
        this.getState = this.getState.bind(this);
        this.subscribe = this.subscribe.bind(this);
    }
    getState() {
        return this.contentBinding.getState();
    }
    addToolResult(result) {
        const state = this.contentBinding.getState();
        if (!state) throw new Error("Message part is not available");
        if (state.type !== "tool-call") throw new Error("Tried to add tool result to non-tool message part");
        if (!this.messageApi) throw new Error("Message API is not available. This is likely a bug in assistant-ui.");
        if (!this.threadApi) throw new Error("Thread API is not available");
        const message = this.messageApi.getState();
        if (!message) throw new Error("Message is not available");
        const toolName = state.toolName;
        const toolCallId = state.toolCallId;
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolResponse"].toResponse(result);
        this.threadApi.getState().addToolResult({
            messageId: message.id,
            toolName,
            toolCallId,
            result: response.result,
            artifact: response.artifact,
            isError: response.isError
        });
    }
    resumeToolCall(payload) {
        const state = this.contentBinding.getState();
        if (!state) throw new Error("Message part is not available");
        if (state.type !== "tool-call") throw new Error("Tried to resume tool call on non-tool message part");
        if (!this.threadApi) throw new Error("Thread API is not available");
        const toolCallId = state.toolCallId;
        this.threadApi.getState().resumeToolCall({
            toolCallId,
            payload
        });
    }
    subscribe(callback) {
        return this.contentBinding.subscribe(callback);
    }
} //# sourceMappingURL=MessagePartRuntime.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/NestedSubscriptionSubject.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NestedSubscriptionSubject",
    ()=>NestedSubscriptionSubject
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$BaseSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/BaseSubject.js [app-client] (ecmascript)");
;
class NestedSubscriptionSubject extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$BaseSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BaseSubject"] {
    binding;
    get path() {
        return this.binding.path;
    }
    constructor(binding){
        super();
        this.binding = binding;
    }
    getState() {
        return this.binding.getState();
    }
    outerSubscribe(callback) {
        return this.binding.subscribe(callback);
    }
    _connect() {
        const callback = ()=>{
            this.notifySubscribers();
        };
        let lastState = this.binding.getState();
        let innerUnsubscribe = lastState?.subscribe(callback);
        const onRuntimeUpdate = ()=>{
            const newState = this.binding.getState();
            if (newState === lastState) return;
            lastState = newState;
            innerUnsubscribe?.();
            innerUnsubscribe = this.binding.getState()?.subscribe(callback);
            callback();
        };
        const outerUnsubscribe = this.outerSubscribe(onRuntimeUpdate);
        return ()=>{
            outerUnsubscribe?.();
            innerUnsubscribe?.();
        };
    }
} //# sourceMappingURL=NestedSubscriptionSubject.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/MessageRuntime.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessageRuntimeImpl",
    ()=>MessageRuntimeImpl,
    "toMessagePartStatus",
    ()=>toMessagePartStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$getExternalStoreMessage$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/getExternalStoreMessage.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$getThreadMessageText$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/getThreadMessageText.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$AttachmentRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/AttachmentRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ComposerRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ComposerRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$MessagePartRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/MessagePartRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$NestedSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/NestedSubscriptionSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/SKIP_UPDATE.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js [app-client] (ecmascript)");
;
;
;
;
;
;
;
;
const COMPLETE_STATUS = Object.freeze({
    type: "complete"
});
const toMessagePartStatus = (message, partIndex, part)=>{
    if (message.role !== "assistant") return COMPLETE_STATUS;
    if (part.type === "tool-call") {
        if (!part.result) {
            return message.status;
        } else {
            return COMPLETE_STATUS;
        }
    }
    const isLastPart = partIndex === Math.max(0, message.content.length - 1);
    if (message.status.type === "requires-action") return COMPLETE_STATUS;
    return isLastPart ? message.status : COMPLETE_STATUS;
};
const getMessagePartState = (message, partIndex)=>{
    const part = message.content[partIndex];
    if (!part) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"];
    }
    // if the message part is the same, don't update
    const status = toMessagePartStatus(message, partIndex, part);
    return Object.freeze({
        ...part,
        ...{
            [__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$getExternalStoreMessage$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["symbolInnerMessage"]]: part[__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$getExternalStoreMessage$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["symbolInnerMessage"]]
        },
        status
    });
};
class MessageRuntimeImpl {
    _core;
    _threadBinding;
    get path() {
        return this._core.path;
    }
    constructor(_core, _threadBinding){
        this._core = _core;
        this._threadBinding = _threadBinding;
        this.composer = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ComposerRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EditComposerRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$NestedSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NestedSubscriptionSubject"]({
            path: {
                ...this.path,
                ref: `${this.path.ref}${this.path.ref}.composer`,
                composerSource: "edit"
            },
            getState: this._getEditComposerRuntimeCore,
            subscribe: (callback)=>this._threadBinding.subscribe(callback)
        }), ()=>this._threadBinding.getState().beginEdit(this._core.getState().id));
        this.__internal_bindMethods();
    }
    __internal_bindMethods() {
        this.reload = this.reload.bind(this);
        this.getState = this.getState.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.getMessagePartByIndex = this.getMessagePartByIndex.bind(this);
        this.getMessagePartByToolCallId = this.getMessagePartByToolCallId.bind(this);
        this.getAttachmentByIndex = this.getAttachmentByIndex.bind(this);
        this.unstable_getCopyText = this.unstable_getCopyText.bind(this);
        this.speak = this.speak.bind(this);
        this.stopSpeaking = this.stopSpeaking.bind(this);
        this.submitFeedback = this.submitFeedback.bind(this);
        this.switchToBranch = this.switchToBranch.bind(this);
    }
    composer;
    _getEditComposerRuntimeCore = ()=>{
        return this._threadBinding.getState().getEditComposer(this._core.getState().id);
    };
    getState() {
        return this._core.getState();
    }
    reload(reloadConfig = {}) {
        const editComposerRuntimeCore = this._getEditComposerRuntimeCore();
        const composerRuntimeCore = editComposerRuntimeCore ?? this._threadBinding.getState().composer;
        const composer = editComposerRuntimeCore ?? composerRuntimeCore;
        const { runConfig = composer.runConfig } = reloadConfig;
        const state = this._core.getState();
        if (state.role !== "assistant") throw new Error("Can only reload assistant messages");
        this._threadBinding.getState().startRun({
            parentId: state.parentId,
            sourceId: state.id,
            runConfig
        });
    }
    speak() {
        const state = this._core.getState();
        return this._threadBinding.getState().speak(state.id);
    }
    stopSpeaking() {
        const state = this._core.getState();
        const thread = this._threadBinding.getState();
        if (thread.speech?.messageId === state.id) {
            this._threadBinding.getState().stopSpeaking();
        } else {
            throw new Error("Message is not being spoken");
        }
    }
    submitFeedback({ type }) {
        const state = this._core.getState();
        this._threadBinding.getState().submitFeedback({
            messageId: state.id,
            type
        });
    }
    switchToBranch({ position, branchId }) {
        const state = this._core.getState();
        if (branchId && position) {
            throw new Error("May not specify both branchId and position");
        } else if (!branchId && !position) {
            throw new Error("Must specify either branchId or position");
        }
        const thread = this._threadBinding.getState();
        const branches = thread.getBranches(state.id);
        let targetBranch = branchId;
        if (position === "previous") {
            targetBranch = branches[state.branchNumber - 2];
        } else if (position === "next") {
            targetBranch = branches[state.branchNumber];
        }
        if (!targetBranch) throw new Error("Branch not found");
        this._threadBinding.getState().switchToBranch(targetBranch);
    }
    unstable_getCopyText() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$getThreadMessageText$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getThreadMessageText"])(this.getState());
    }
    subscribe(callback) {
        return this._core.subscribe(callback);
    }
    getMessagePartByIndex(idx) {
        if (idx < 0) throw new Error("Message part index must be >= 0");
        return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$MessagePartRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessagePartRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: {
                ...this.path,
                ref: `${this.path.ref}${this.path.ref}.content[${idx}]`,
                messagePartSelector: {
                    type: "index",
                    index: idx
                }
            },
            getState: ()=>{
                return getMessagePartState(this.getState(), idx);
            },
            subscribe: (callback)=>this._core.subscribe(callback)
        }), this._core, this._threadBinding);
    }
    getMessagePartByToolCallId(toolCallId) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$MessagePartRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessagePartRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: {
                ...this.path,
                ref: this.path.ref + `${this.path.ref}.content[toolCallId=${JSON.stringify(toolCallId)}]`,
                messagePartSelector: {
                    type: "toolCallId",
                    toolCallId
                }
            },
            getState: ()=>{
                const state = this._core.getState();
                const idx = state.content.findIndex((part)=>part.type === "tool-call" && part.toolCallId === toolCallId);
                if (idx === -1) return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"];
                return getMessagePartState(state, idx);
            },
            subscribe: (callback)=>this._core.subscribe(callback)
        }), this._core, this._threadBinding);
    }
    getAttachmentByIndex(idx) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$AttachmentRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessageAttachmentRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: {
                ...this.path,
                ref: `${this.path.ref}${this.path.ref}.attachments[${idx}]`,
                attachmentSource: "message",
                attachmentSelector: {
                    type: "index",
                    index: idx
                }
            },
            getState: ()=>{
                const attachments = this.getState().attachments;
                const attachment = attachments?.[idx];
                if (!attachment) return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"];
                return {
                    ...attachment,
                    source: "message"
                };
            },
            subscribe: (callback)=>this._core.subscribe(callback)
        }));
    }
} //# sourceMappingURL=MessageRuntime.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadRuntime.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThreadRuntimeImpl",
    ()=>ThreadRuntimeImpl,
    "getThreadState",
    ()=>getThreadState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$MessageRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/MessageRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$NestedSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/NestedSubscriptionSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ComposerRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ComposerRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/SKIP_UPDATE.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$EventSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/EventSubscriptionSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$getExternalStoreMessage$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/getExternalStoreMessage.js [app-client] (ecmascript)");
;
;
;
;
;
;
;
const toResumeRunConfig = (message)=>{
    return {
        parentId: message.parentId ?? null,
        sourceId: message.sourceId ?? null,
        runConfig: message.runConfig ?? {},
        ...message.stream ? {
            stream: message.stream
        } : {}
    };
};
const toStartRunConfig = (message)=>{
    return {
        parentId: message.parentId ?? null,
        sourceId: message.sourceId ?? null,
        runConfig: message.runConfig ?? {}
    };
};
const toAppendMessage = (messages, message)=>{
    if (typeof message === "string") {
        return {
            createdAt: new Date(),
            parentId: messages.at(-1)?.id ?? null,
            sourceId: null,
            runConfig: {},
            role: "user",
            content: [
                {
                    type: "text",
                    text: message
                }
            ],
            attachments: [],
            metadata: {
                custom: {}
            }
        };
    }
    return {
        createdAt: message.createdAt ?? new Date(),
        parentId: message.parentId ?? messages.at(-1)?.id ?? null,
        sourceId: message.sourceId ?? null,
        role: message.role ?? "user",
        content: message.content,
        attachments: message.attachments ?? [],
        metadata: message.metadata ?? {
            custom: {}
        },
        runConfig: message.runConfig ?? {},
        startRun: message.startRun
    };
};
const getThreadState = (runtime, threadListItemState)=>{
    const lastMessage = runtime.messages.at(-1);
    return Object.freeze({
        threadId: threadListItemState.id,
        metadata: threadListItemState,
        capabilities: runtime.capabilities,
        isDisabled: runtime.isDisabled,
        isLoading: runtime.isLoading,
        isRunning: lastMessage?.role !== "assistant" ? false : lastMessage.status.type === "running",
        messages: runtime.messages,
        state: runtime.state,
        suggestions: runtime.suggestions,
        extras: runtime.extras,
        speech: runtime.speech
    });
};
class ThreadRuntimeImpl {
    get path() {
        return this._threadBinding.path;
    }
    get __internal_threadBinding() {
        return this._threadBinding;
    }
    _threadBinding;
    constructor(threadBinding, threadListItemBinding){
        const stateBinding = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: threadBinding.path,
            getState: ()=>getThreadState(threadBinding.getState(), threadListItemBinding.getState()),
            subscribe: (callback)=>{
                const sub1 = threadBinding.subscribe(callback);
                const sub2 = threadListItemBinding.subscribe(callback);
                return ()=>{
                    sub1();
                    sub2();
                };
            }
        });
        this._threadBinding = {
            path: threadBinding.path,
            getState: ()=>threadBinding.getState(),
            getStateState: ()=>stateBinding.getState(),
            outerSubscribe: (callback)=>threadBinding.outerSubscribe(callback),
            subscribe: (callback)=>threadBinding.subscribe(callback)
        };
        this.composer = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ComposerRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThreadComposerRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$NestedSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NestedSubscriptionSubject"]({
            path: {
                ...this.path,
                ref: `${this.path.ref}${this.path.ref}.composer`,
                composerSource: "thread"
            },
            getState: ()=>this._threadBinding.getState().composer,
            subscribe: (callback)=>this._threadBinding.subscribe(callback)
        }));
        this.__internal_bindMethods();
    }
    __internal_bindMethods() {
        this.append = this.append.bind(this);
        this.unstable_resumeRun = this.unstable_resumeRun.bind(this);
        this.unstable_loadExternalState = this.unstable_loadExternalState.bind(this);
        this.importExternalState = this.importExternalState.bind(this);
        this.exportExternalState = this.exportExternalState.bind(this);
        this.startRun = this.startRun.bind(this);
        this.cancelRun = this.cancelRun.bind(this);
        this.stopSpeaking = this.stopSpeaking.bind(this);
        this.export = this.export.bind(this);
        this.import = this.import.bind(this);
        this.reset = this.reset.bind(this);
        this.getMessageByIndex = this.getMessageByIndex.bind(this);
        this.getMessageById = this.getMessageById.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unstable_on = this.unstable_on.bind(this);
        this.getModelContext = this.getModelContext.bind(this);
        this.getModelConfig = this.getModelConfig.bind(this);
        this.getState = this.getState.bind(this);
    }
    composer;
    getState() {
        return this._threadBinding.getStateState();
    }
    append(message) {
        this._threadBinding.getState().append(toAppendMessage(this._threadBinding.getState().messages, message));
    }
    subscribe(callback) {
        return this._threadBinding.subscribe(callback);
    }
    getModelContext() {
        return this._threadBinding.getState().getModelContext();
    }
    getModelConfig() {
        return this.getModelContext();
    }
    startRun(configOrParentId) {
        const config = configOrParentId === null || typeof configOrParentId === "string" ? {
            parentId: configOrParentId
        } : configOrParentId;
        return this._threadBinding.getState().startRun(toStartRunConfig(config));
    }
    unstable_resumeRun(config) {
        return this._threadBinding.getState().resumeRun(toResumeRunConfig(config));
    }
    exportExternalState() {
        return this._threadBinding.getState().exportExternalState();
    }
    importExternalState(state) {
        this._threadBinding.getState().importExternalState(state);
    }
    unstable_loadExternalState(state) {
        this._threadBinding.getState().unstable_loadExternalState(state);
    }
    cancelRun() {
        this._threadBinding.getState().cancelRun();
    }
    stopSpeaking() {
        return this._threadBinding.getState().stopSpeaking();
    }
    export() {
        return this._threadBinding.getState().export();
    }
    import(data) {
        this._threadBinding.getState().import(data);
    }
    reset(initialMessages) {
        this._threadBinding.getState().reset(initialMessages);
    }
    getMessageByIndex(idx) {
        if (idx < 0) throw new Error("Message index must be >= 0");
        return this._getMessageRuntime({
            ...this.path,
            ref: `${this.path.ref}${this.path.ref}.messages[${idx}]`,
            messageSelector: {
                type: "index",
                index: idx
            }
        }, ()=>{
            const messages = this._threadBinding.getState().messages;
            const message = messages[idx];
            if (!message) return undefined;
            return {
                message,
                parentId: messages[idx - 1]?.id ?? null,
                index: idx
            };
        });
    }
    getMessageById(messageId) {
        return this._getMessageRuntime({
            ...this.path,
            ref: this.path.ref + `${this.path.ref}.messages[messageId=${JSON.stringify(messageId)}]`,
            messageSelector: {
                type: "messageId",
                messageId: messageId
            }
        }, ()=>this._threadBinding.getState().getMessageById(messageId));
    }
    _getMessageRuntime(path, callback) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$MessageRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessageRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path,
            getState: ()=>{
                const { message, parentId, index } = callback() ?? {};
                const { messages, speech: speechState } = this._threadBinding.getState();
                if (!message || parentId === undefined || index === undefined) return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"];
                const thread = this._threadBinding.getState();
                const branches = thread.getBranches(message.id);
                const submittedFeedback = message.metadata.submittedFeedback;
                return {
                    ...message,
                    ...{
                        [__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$getExternalStoreMessage$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["symbolInnerMessage"]]: message[__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$getExternalStoreMessage$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["symbolInnerMessage"]]
                    },
                    index,
                    isLast: messages.at(-1)?.id === message.id,
                    parentId,
                    branchNumber: branches.indexOf(message.id) + 1,
                    branchCount: branches.length,
                    speech: speechState?.messageId === message.id ? speechState : undefined,
                    submittedFeedback
                };
            },
            subscribe: (callback)=>this._threadBinding.subscribe(callback)
        }), this._threadBinding);
    }
    _eventSubscriptionSubjects = new Map();
    unstable_on(event, callback) {
        let subject = this._eventSubscriptionSubjects.get(event);
        if (!subject) {
            subject = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$EventSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EventSubscriptionSubject"]({
                event: event,
                binding: this._threadBinding
            });
            this._eventSubscriptionSubjects.set(event, subject);
        }
        return subject.subscribe(callback);
    }
} //# sourceMappingURL=ThreadRuntime.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadListRuntime.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThreadListRuntimeImpl",
    ()=>ThreadListRuntimeImpl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$LazyMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/LazyMemoizeSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadListItemRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadListItemRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/SKIP_UPDATE.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$NestedSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/NestedSubscriptionSubject.js [app-client] (ecmascript)");
;
;
;
;
;
;
const getThreadListState = (threadList)=>{
    return {
        mainThreadId: threadList.mainThreadId,
        newThreadId: threadList.newThreadId,
        threadIds: threadList.threadIds,
        archivedThreadIds: threadList.archivedThreadIds,
        isLoading: threadList.isLoading,
        threadItems: threadList.threadItems
    };
};
const getThreadListItemState = (threadList, threadId)=>{
    if (threadId === undefined) return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"];
    const threadData = threadList.getItemById(threadId);
    if (!threadData) return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$SKIP_UPDATE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SKIP_UPDATE"];
    return {
        id: threadData.id,
        remoteId: threadData.remoteId,
        externalId: threadData.externalId,
        title: threadData.title,
        status: threadData.status,
        isMain: threadData.id === threadList.mainThreadId
    };
};
class ThreadListRuntimeImpl {
    _core;
    _runtimeFactory;
    _getState;
    constructor(_core, _runtimeFactory = __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThreadRuntimeImpl"]){
        this._core = _core;
        this._runtimeFactory = _runtimeFactory;
        const stateBinding = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$LazyMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LazyMemoizeSubject"]({
            path: {},
            getState: ()=>getThreadListState(_core),
            subscribe: (callback)=>_core.subscribe(callback)
        });
        this._getState = stateBinding.getState.bind(stateBinding);
        this._mainThreadListItemRuntime = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadListItemRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThreadListItemRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: {
                ref: `threadItems[main]`,
                threadSelector: {
                    type: "main"
                }
            },
            getState: ()=>{
                return getThreadListItemState(this._core, this._core.mainThreadId);
            },
            subscribe: (callback)=>this._core.subscribe(callback)
        }), this._core);
        this.main = new _runtimeFactory(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$NestedSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NestedSubscriptionSubject"]({
            path: {
                ref: "threads.main",
                threadSelector: {
                    type: "main"
                }
            },
            getState: ()=>_core.getMainThreadRuntimeCore(),
            subscribe: (callback)=>_core.subscribe(callback)
        }), this._mainThreadListItemRuntime);
        this.__internal_bindMethods();
    }
    __internal_bindMethods() {
        this.switchToThread = this.switchToThread.bind(this);
        this.switchToNewThread = this.switchToNewThread.bind(this);
        this.getState = this.getState.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.getById = this.getById.bind(this);
        this.getItemById = this.getItemById.bind(this);
        this.getItemByIndex = this.getItemByIndex.bind(this);
        this.getArchivedItemByIndex = this.getArchivedItemByIndex.bind(this);
    }
    switchToThread(threadId) {
        return this._core.switchToThread(threadId);
    }
    switchToNewThread() {
        return this._core.switchToNewThread();
    }
    getState() {
        return this._getState();
    }
    subscribe(callback) {
        return this._core.subscribe(callback);
    }
    _mainThreadListItemRuntime;
    main;
    get mainItem() {
        return this._mainThreadListItemRuntime;
    }
    getById(threadId) {
        return new this._runtimeFactory(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$NestedSubscriptionSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NestedSubscriptionSubject"]({
            path: {
                ref: `threads[threadId=${JSON.stringify(threadId)}]`,
                threadSelector: {
                    type: "threadId",
                    threadId
                }
            },
            getState: ()=>this._core.getThreadRuntimeCore(threadId),
            subscribe: (callback)=>this._core.subscribe(callback)
        }), this.mainItem);
    }
    getItemByIndex(idx) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadListItemRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThreadListItemRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: {
                ref: `threadItems[${idx}]`,
                threadSelector: {
                    type: "index",
                    index: idx
                }
            },
            getState: ()=>{
                return getThreadListItemState(this._core, this._core.threadIds[idx]);
            },
            subscribe: (callback)=>this._core.subscribe(callback)
        }), this._core);
    }
    getArchivedItemByIndex(idx) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadListItemRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThreadListItemRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: {
                ref: `archivedThreadItems[${idx}]`,
                threadSelector: {
                    type: "archiveIndex",
                    index: idx
                }
            },
            getState: ()=>{
                return getThreadListItemState(this._core, this._core.archivedThreadIds[idx]);
            },
            subscribe: (callback)=>this._core.subscribe(callback)
        }), this._core);
    }
    getItemById(threadId) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadListItemRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThreadListItemRuntimeImpl"](new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$subscribable$2f$ShallowMemoizeSubject$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShallowMemoizeSubject"]({
            path: {
                ref: `threadItems[threadId=${threadId}]`,
                threadSelector: {
                    type: "threadId",
                    threadId
                }
            },
            getState: ()=>{
                return getThreadListItemState(this._core, threadId);
            },
            subscribe: (callback)=>this._core.subscribe(callback)
        }), this._core);
    }
} //# sourceMappingURL=ThreadListRuntime.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/AssistantRuntime.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AssistantRuntimeImpl",
    ()=>AssistantRuntimeImpl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadListRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadListRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$utils$2f$MessageRepository$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/utils/MessageRepository.js [app-client] (ecmascript)");
;
;
class AssistantRuntimeImpl {
    _core;
    threads;
    get threadList() {
        return this.threads;
    }
    _thread;
    constructor(_core){
        this._core = _core;
        this.threads = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadListRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThreadListRuntimeImpl"](_core.threads);
        this._thread = this.threads.main;
        this.__internal_bindMethods();
    }
    __internal_bindMethods() {
        this.switchToNewThread = this.switchToNewThread.bind(this);
        this.switchToThread = this.switchToThread.bind(this);
        this.registerModelContextProvider = this.registerModelContextProvider.bind(this);
        this.registerModelConfigProvider = this.registerModelConfigProvider.bind(this);
        this.reset = this.reset.bind(this);
    }
    get thread() {
        return this._thread;
    }
    switchToNewThread() {
        return this._core.threads.switchToNewThread();
    }
    switchToThread(threadId) {
        return this._core.threads.switchToThread(threadId);
    }
    registerModelContextProvider(provider) {
        return this._core.registerModelContextProvider(provider);
    }
    registerModelConfigProvider(provider) {
        return this.registerModelContextProvider(provider);
    }
    reset({ initialMessages } = {}) {
        return this._core.threads.getMainThreadRuntimeCore().import(__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$utils$2f$MessageRepository$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ExportedMessageRepository"].fromArray(initialMessages ?? []));
    }
} //# sourceMappingURL=AssistantRuntime.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/local/LocalRuntimeOptions.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "splitLocalRuntimeOptions",
    ()=>splitLocalRuntimeOptions
]);
const splitLocalRuntimeOptions = (options)=>{
    const { cloud, initialMessages, maxSteps, adapters, unstable_humanToolNames, ...rest } = options;
    return {
        localRuntimeOptions: {
            cloud,
            initialMessages,
            maxSteps,
            adapters,
            unstable_humanToolNames
        },
        otherOptions: rest
    };
}; //# sourceMappingURL=LocalRuntimeOptions.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/assistant-transport/useToolInvocations.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useToolInvocations",
    ()=>useToolInvocations
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$assistant$2d$stream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/modules/assistant-stream.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/ToolResponse.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$toolResultStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__toolResultStream__as__unstable_toolResultStream$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/toolResultStream.js [app-client] (ecmascript) <export toolResultStream as unstable_toolResultStream>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$AssistantMetaTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/AssistantMetaTransformStream.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
const isArgsTextComplete = (argsText)=>{
    try {
        JSON.parse(argsText);
        return true;
    } catch  {
        return false;
    }
};
function useToolInvocations({ state, getTools, onResult, setToolStatuses }) {
    _s();
    const lastToolStates = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])({});
    const humanInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const acRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new AbortController());
    const executingCountRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const settledResolversRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    const [controller] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "useToolInvocations.useState": ()=>{
            const [stream, controller] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$assistant$2d$stream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createAssistantStreamController"])();
            const transform = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$toolResultStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__toolResultStream__as__unstable_toolResultStream$3e$__["unstable_toolResultStream"])(getTools, {
                "useToolInvocations.useState.transform": ()=>acRef.current?.signal ?? new AbortController().signal
            }["useToolInvocations.useState.transform"], {
                "useToolInvocations.useState.transform": (toolCallId, payload)=>{
                    return new Promise({
                        "useToolInvocations.useState.transform": (resolve, reject)=>{
                            // Reject previous human input request if it exists
                            const previous = humanInputRef.current.get(toolCallId);
                            if (previous) {
                                previous.reject(new Error("Human input request was superseded by a new request"));
                            }
                            humanInputRef.current.set(toolCallId, {
                                resolve,
                                reject
                            });
                            setToolStatuses({
                                "useToolInvocations.useState.transform": (prev)=>({
                                        ...prev,
                                        [toolCallId]: {
                                            type: "interrupt",
                                            payload: {
                                                type: "human",
                                                payload
                                            }
                                        }
                                    })
                            }["useToolInvocations.useState.transform"]);
                        }
                    }["useToolInvocations.useState.transform"]);
                }
            }["useToolInvocations.useState.transform"], {
                onExecutionStart: {
                    "useToolInvocations.useState.transform": (toolCallId)=>{
                        executingCountRef.current++;
                        setToolStatuses({
                            "useToolInvocations.useState.transform": (prev)=>({
                                    ...prev,
                                    [toolCallId]: {
                                        type: "executing"
                                    }
                                })
                        }["useToolInvocations.useState.transform"]);
                    }
                }["useToolInvocations.useState.transform"],
                onExecutionEnd: {
                    "useToolInvocations.useState.transform": (toolCallId)=>{
                        executingCountRef.current--;
                        setToolStatuses({
                            "useToolInvocations.useState.transform": (prev)=>{
                                const next = {
                                    ...prev
                                };
                                delete next[toolCallId];
                                return next;
                            }
                        }["useToolInvocations.useState.transform"]);
                        // Resolve any waiting abort promises when all tools have settled
                        if (executingCountRef.current === 0) {
                            settledResolversRef.current.forEach({
                                "useToolInvocations.useState.transform": (resolve)=>resolve()
                            }["useToolInvocations.useState.transform"]);
                            settledResolversRef.current = [];
                        }
                    }
                }["useToolInvocations.useState.transform"]
            });
            stream.pipeThrough(transform).pipeThrough(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$AssistantMetaTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AssistantMetaTransformStream"]()).pipeTo(new WritableStream({
                write (chunk) {
                    if (chunk.type === "result") {
                        // the tool call result was already set by the backend
                        if (lastToolStates.current[chunk.meta.toolCallId]?.hasResult) return;
                        onResult({
                            type: "add-tool-result",
                            toolCallId: chunk.meta.toolCallId,
                            toolName: chunk.meta.toolName,
                            result: chunk.result,
                            isError: chunk.isError,
                            ...chunk.artifact && {
                                artifact: chunk.artifact
                            }
                        });
                    }
                }
            }));
            return controller;
        }
    }["useToolInvocations.useState"]);
    const ignoredToolIds = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Set());
    const isInitialState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useToolInvocations.useEffect": ()=>{
            const processMessages = {
                "useToolInvocations.useEffect.processMessages": (messages)=>{
                    messages.forEach({
                        "useToolInvocations.useEffect.processMessages": (message)=>{
                            message.content.forEach({
                                "useToolInvocations.useEffect.processMessages": (content)=>{
                                    if (content.type === "tool-call") {
                                        if (isInitialState.current) {
                                            ignoredToolIds.current.add(content.toolCallId);
                                        } else {
                                            if (ignoredToolIds.current.has(content.toolCallId)) {
                                                return;
                                            }
                                            let lastState = lastToolStates.current[content.toolCallId];
                                            if (!lastState) {
                                                const toolCallController = controller.addToolCallPart({
                                                    toolName: content.toolName,
                                                    toolCallId: content.toolCallId
                                                });
                                                lastState = {
                                                    argsText: "",
                                                    hasResult: false,
                                                    argsComplete: false,
                                                    controller: toolCallController
                                                };
                                                lastToolStates.current[content.toolCallId] = lastState;
                                            }
                                            if (content.argsText !== lastState.argsText) {
                                                if (lastState.argsComplete) {
                                                    if ("TURBOPACK compile-time truthy", 1) {
                                                        console.warn("argsText updated after controller was closed:", {
                                                            previous: lastState.argsText,
                                                            next: content.argsText
                                                        });
                                                    }
                                                } else {
                                                    if (!content.argsText.startsWith(lastState.argsText)) {
                                                        // Check if this is key reordering (both are complete JSON)
                                                        // This happens when transitioning from streaming to complete state
                                                        // and the provider returns keys in a different order
                                                        if (isArgsTextComplete(lastState.argsText) && isArgsTextComplete(content.argsText)) {
                                                            lastState.controller.argsText.close();
                                                            lastToolStates.current[content.toolCallId] = {
                                                                argsText: content.argsText,
                                                                hasResult: lastState.hasResult,
                                                                argsComplete: true,
                                                                controller: lastState.controller
                                                            };
                                                            return; // Continue to next content part
                                                        }
                                                        throw new Error(`Tool call argsText can only be appended, not updated: ${content.argsText} does not start with ${lastState.argsText}`);
                                                    }
                                                    const argsTextDelta = content.argsText.slice(lastState.argsText.length);
                                                    lastState.controller.argsText.append(argsTextDelta);
                                                    const shouldClose = isArgsTextComplete(content.argsText);
                                                    if (shouldClose) {
                                                        lastState.controller.argsText.close();
                                                    }
                                                    lastToolStates.current[content.toolCallId] = {
                                                        argsText: content.argsText,
                                                        hasResult: lastState.hasResult,
                                                        argsComplete: shouldClose,
                                                        controller: lastState.controller
                                                    };
                                                }
                                            }
                                            if (content.result !== undefined && !lastState.hasResult) {
                                                lastState.controller.setResponse(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolResponse"]({
                                                    result: content.result,
                                                    artifact: content.artifact,
                                                    isError: content.isError
                                                }));
                                                lastState.controller.close();
                                                lastToolStates.current[content.toolCallId] = {
                                                    hasResult: true,
                                                    argsComplete: true,
                                                    argsText: lastState.argsText,
                                                    controller: lastState.controller
                                                };
                                            }
                                        }
                                        // Recursively process nested messages
                                        if (content.messages) {
                                            processMessages(content.messages);
                                        }
                                    }
                                }
                            }["useToolInvocations.useEffect.processMessages"]);
                        }
                    }["useToolInvocations.useEffect.processMessages"]);
                }
            }["useToolInvocations.useEffect.processMessages"];
            processMessages(state.messages);
            if (isInitialState.current) {
                isInitialState.current = false;
            }
        }
    }["useToolInvocations.useEffect"], [
        state,
        controller
    ]);
    const abort = ()=>{
        humanInputRef.current.forEach(({ reject })=>{
            reject(new Error("Tool execution aborted"));
        });
        humanInputRef.current.clear();
        acRef.current.abort();
        acRef.current = new AbortController();
        // Return a promise that resolves when all executing tools have settled
        if (executingCountRef.current === 0) {
            return Promise.resolve();
        }
        return new Promise((resolve)=>{
            settledResolversRef.current.push(resolve);
        });
    };
    return {
        reset: ()=>{
            void abort();
            isInitialState.current = true;
        },
        abort,
        resume: (toolCallId, payload)=>{
            const handlers = humanInputRef.current.get(toolCallId);
            if (handlers) {
                humanInputRef.current.delete(toolCallId);
                setToolStatuses((prev)=>({
                        ...prev,
                        [toolCallId]: {
                            type: "executing"
                        }
                    }));
                handlers.resolve(payload);
            } else {
                throw new Error(`Tool call ${toolCallId} is not waiting for human input`);
            }
        }
    };
} //# sourceMappingURL=useToolInvocations.js.map
_s(useToolInvocations, "dW9WIHiCjNdfepFYsqzp1mBy9Cg=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/smooth/index.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
"use client";
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
 //# sourceMappingURL=index.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/context/react/utils/createContextStoreHook.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Creates hooks for accessing a store within a context.
 * @param contextHook - The hook to access the context.
 * @param contextKey - The key of the store in the context.
 * @returns An object containing the hooks: `use...` and `use...Store`.
 */ __turbopack_context__.s([
    "createContextStoreHook",
    ()=>createContextStoreHook
]);
function createContextStoreHook(contextHook, contextKey) {
    var _s = __turbopack_context__.k.signature();
    function useStoreStoreHook(options) {
        const context = contextHook(options);
        if (!context) return null;
        return context[contextKey];
    }
    function useStoreHook(param) {
        _s();
        let optional = false;
        let selector;
        if (typeof param === "function") {
            selector = param;
        } else if (param && typeof param === "object") {
            optional = !!param.optional;
            selector = param.selector;
        }
        const store = useStoreStoreHook({
            optional
        });
        if (!store) return null;
        return selector ? store(selector) : store();
    }
    _s(useStoreHook, "0Z0qWgPYYS7oHk4pu9z1XXM6Qu8=", false, function() {
        return [
            useStoreStoreHook
        ];
    });
    // Return an object with keys based on contextKey
    return {
        [contextKey]: useStoreHook,
        [`${contextKey}Store`]: useStoreStoreHook
    };
} //# sourceMappingURL=createContextStoreHook.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/smooth/SmoothContext.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SmoothContextProvider",
    ()=>SmoothContextProvider,
    "useSmoothStatus",
    ()=>useSmoothStatus,
    "useSmoothStatusStore",
    ()=>useSmoothStatusStore,
    "withSmoothContextProvider",
    ()=>withSmoothContextProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/store/dist/useAui.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$context$2f$react$2f$utils$2f$createContextStoreHook$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/context/react/utils/createContextStoreHook.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const SmoothContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
const makeSmoothContext = (initialState)=>{
    const useSmoothStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])(()=>initialState);
    return {
        useSmoothStatus
    };
};
const SmoothContextProvider = ({ children })=>{
    _s();
    const outer = useSmoothContext({
        optional: true
    });
    const aui = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAui"])();
    const [context] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "SmoothContextProvider.useState": ()=>makeSmoothContext(aui.part().getState().status)
    }["SmoothContextProvider.useState"]);
    // do not wrap if there is an outer SmoothContextProvider
    if (outer) return children;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(SmoothContext.Provider, {
        value: context,
        children: children
    });
};
_s(SmoothContextProvider, "jNZpFdit60SyPUzWyhV75/0sOeo=", false, function() {
    return [
        useSmoothContext,
        __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAui"]
    ];
});
_c = SmoothContextProvider;
const withSmoothContextProvider = (Component)=>{
    const Wrapped = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])((props, ref)=>{
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(SmoothContextProvider, {
            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(Component, {
                ...props,
                ref: ref
            })
        });
    });
    Wrapped.displayName = Component.displayName;
    return Wrapped;
};
function useSmoothContext(options) {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(SmoothContext);
    if (!options?.optional && !context) throw new Error("This component must be used within a SmoothContextProvider.");
    return context;
}
_s1(useSmoothContext, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
const { useSmoothStatus, useSmoothStatusStore } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$context$2f$react$2f$utils$2f$createContextStoreHook$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContextStoreHook"])(useSmoothContext, "useSmoothStatus"); //# sourceMappingURL=SmoothContext.js.map
var _c;
__turbopack_context__.k.register(_c, "SmoothContextProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/context/ReadonlyStore.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "writableStore",
    ()=>writableStore
]);
const writableStore = (store)=>{
    return store;
}; //# sourceMappingURL=ReadonlyStore.js.map
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/smooth/useSmooth.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSmooth",
    ()=>useSmooth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/store/dist/useAuiState.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$use$2d$callback$2d$ref$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$SmoothContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/smooth/SmoothContext.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$context$2f$ReadonlyStore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/context/ReadonlyStore.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
class TextStreamAnimator {
    currentText;
    setText;
    animationFrameId = null;
    lastUpdateTime = Date.now();
    targetText = "";
    constructor(currentText, setText){
        this.currentText = currentText;
        this.setText = setText;
    }
    start() {
        if (this.animationFrameId !== null) return;
        this.lastUpdateTime = Date.now();
        this.animate();
    }
    stop() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    animate = ()=>{
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        let timeToConsume = deltaTime;
        const remainingChars = this.targetText.length - this.currentText.length;
        const baseTimePerChar = Math.min(5, 250 / remainingChars);
        let charsToAdd = 0;
        while(timeToConsume >= baseTimePerChar && charsToAdd < remainingChars){
            charsToAdd++;
            timeToConsume -= baseTimePerChar;
        }
        if (charsToAdd !== remainingChars) {
            this.animationFrameId = requestAnimationFrame(this.animate);
        } else {
            this.animationFrameId = null;
        }
        if (charsToAdd === 0) return;
        this.currentText = this.targetText.slice(0, this.currentText.length + charsToAdd);
        this.lastUpdateTime = currentTime - timeToConsume;
        this.setText(this.currentText);
    };
}
const SMOOTH_STATUS = Object.freeze({
    type: "running"
});
const useSmooth = (state, smooth = false)=>{
    _s();
    const { text } = state;
    const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"])({
        "useSmooth.useAuiState[id]": ({ message })=>message.id
    }["useSmooth.useAuiState[id]"]);
    const idRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(id);
    const [displayedText, setDisplayedText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(text);
    const smoothStatusStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$SmoothContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSmoothStatusStore"])({
        optional: true
    });
    const setText = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$use$2d$callback$2d$ref$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallbackRef"])({
        "useSmooth.useCallbackRef[setText]": (text)=>{
            setDisplayedText(text);
            if (smoothStatusStore) {
                const target = displayedText !== text || state.status.type === "running" ? SMOOTH_STATUS : state.status;
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$context$2f$ReadonlyStore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["writableStore"])(smoothStatusStore).setState(target, true);
            }
        }
    }["useSmooth.useCallbackRef[setText]"]);
    // TODO this is hacky
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useSmooth.useEffect": ()=>{
            if (smoothStatusStore) {
                const target = smooth && (displayedText !== text || state.status.type === "running") ? SMOOTH_STATUS : state.status;
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$context$2f$ReadonlyStore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["writableStore"])(smoothStatusStore).setState(target, true);
            }
        }
    }["useSmooth.useEffect"], [
        smoothStatusStore,
        smooth,
        text,
        displayedText,
        state.status
    ]);
    const [animatorRef] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new TextStreamAnimator(text, setText));
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useSmooth.useEffect": ()=>{
            if (!smooth) {
                animatorRef.stop();
                return;
            }
            if (idRef.current !== id || !text.startsWith(animatorRef.targetText)) {
                idRef.current = id;
                setText(text);
                animatorRef.currentText = text;
                animatorRef.targetText = text;
                animatorRef.stop();
                return;
            }
            animatorRef.targetText = text;
            animatorRef.start();
        }
    }["useSmooth.useEffect"], [
        setText,
        animatorRef,
        id,
        smooth,
        text
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useSmooth.useEffect": ()=>{
            return ({
                "useSmooth.useEffect": ()=>{
                    animatorRef.stop();
                }
            })["useSmooth.useEffect"];
        }
    }["useSmooth.useEffect"], [
        animatorRef
    ]);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useSmooth.useMemo": ()=>smooth ? {
                type: "text",
                text: displayedText,
                status: text === displayedText ? state.status : SMOOTH_STATUS
            } : state
    }["useSmooth.useMemo"], [
        smooth,
        displayedText,
        state,
        text
    ]);
}; //# sourceMappingURL=useSmooth.js.map
_s(useSmooth, "XjCuhHSFWbFy2tKscE2SaBjlipM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$SmoothContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSmoothStatusStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$use$2d$callback$2d$ref$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallbackRef"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/smooth/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSmooth",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$useSmooth$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSmooth"],
    "useSmoothStatus",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$SmoothContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSmoothStatus"],
    "withSmoothContextProvider",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$SmoothContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withSmoothContextProvider"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/smooth/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$useSmooth$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/smooth/useSmooth.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$SmoothContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/smooth/SmoothContext.js [app-client] (ecmascript)");
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/internal.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AssistantRuntimeImpl",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$AssistantRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AssistantRuntimeImpl"],
    "BaseAssistantRuntimeCore",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$core$2f$BaseAssistantRuntimeCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BaseAssistantRuntimeCore"],
    "CompositeContextProvider",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$CompositeContextProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CompositeContextProvider"],
    "DefaultThreadComposerRuntimeCore",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$composer$2f$DefaultThreadComposerRuntimeCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DefaultThreadComposerRuntimeCore"],
    "MessageRepository",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$utils$2f$MessageRepository$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessageRepository"],
    "ThreadRuntimeImpl",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThreadRuntimeImpl"],
    "fromThreadMessageLike",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$ThreadMessageLike$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fromThreadMessageLike"],
    "generateId",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$idUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateId"],
    "getAutoStatus",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$auto$2d$status$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAutoStatus"],
    "splitLocalRuntimeOptions",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$local$2f$LocalRuntimeOptions$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["splitLocalRuntimeOptions"],
    "useSmooth",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSmooth"],
    "useSmoothStatus",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSmoothStatus"],
    "useToolInvocations",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$assistant$2d$transport$2f$useToolInvocations$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToolInvocations"],
    "withSmoothContextProvider",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withSmoothContextProvider"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$internal$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/internal.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$composer$2f$DefaultThreadComposerRuntimeCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/composer/DefaultThreadComposerRuntimeCore.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$CompositeContextProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/CompositeContextProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$utils$2f$MessageRepository$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/utils/MessageRepository.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$core$2f$BaseAssistantRuntimeCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/core/BaseAssistantRuntimeCore.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$idUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/idUtils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$AssistantRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/AssistantRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2f$ThreadRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$ThreadMessageLike$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/ThreadMessageLike.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$external$2d$store$2f$auto$2d$status$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/auto-status.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$local$2f$LocalRuntimeOptions$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/local/LocalRuntimeOptions.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$runtime$2d$cores$2f$assistant$2d$transport$2f$useToolInvocations$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/assistant-transport/useToolInvocations.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$utils$2f$smooth$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/utils/smooth/index.js [app-client] (ecmascript)");
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/internal.js [app-client] (ecmascript) <export * as INTERNAL>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "INTERNAL",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$internal$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$internal$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/internal.js [app-client] (ecmascript)");
}),
"[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/react/dist/primitives/messagePart/useMessagePartText.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useMessagePartText",
    ()=>useMessagePartText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/@assistant-ui/store/dist/useAuiState.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
const useMessagePartText = ()=>{
    _s();
    const text = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"])({
        "useMessagePartText.useAuiState[text]": ({ part })=>{
            if (part.type !== "text" && part.type !== "reasoning") throw new Error("MessagePartText can only be used inside text or reasoning message parts.");
            return part;
        }
    }["useMessagePartText.useAuiState[text]"]);
    return text;
}; //# sourceMappingURL=useMessagePartText.js.map
_s(useMessagePartText, "ehSFnyemyAOgIIWEIMI0X9Zznqo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=1198e_%40assistant-ui_react_dist_070e3f20._.js.map