(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/json/fix-json.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// LICENSE for this file only
// Implemented as a scanner with additional fixing
// that performs a single linear time scan pass over the partial JSON.
//
// The states should ideally match relevant states from the JSON spec:
// https://www.json.org/json-en.html
//
// Please note that invalid JSON is not considered/covered, because it
// is assumed that the resulting JSON will be processed by a standard
// JSON parser that will detect any invalid JSON.
// Returns a tuple of [fixedJson, partialPath]
// partialPath is an array of object/array keys that represent
// the currently partial values. An object is considered partial
// if through appending extra characters to the JSON string, its
// value could change.
// Example input: '{"foo":[{"a":f'
// Example output: ['{"foo":[{"a":false}]}', ['foo', '0']]
// Example input: '{"foo":'
// Example output: ['{}', []]
__turbopack_context__.s([
    "fixJson",
    ()=>fixJson
]);
function fixJson(input) {
    const stack = [
        "ROOT"
    ];
    let lastValidIndex = -1;
    let literalStart = null;
    const path = [];
    let currentKey;
    function pushCurrentKeyToPath() {
        if (currentKey !== undefined) {
            path.push(JSON.parse(`"${currentKey}"`));
            currentKey = undefined;
        }
    }
    function processValueStart(char, i, swapState) {
        switch(char){
            case '"':
                {
                    lastValidIndex = i;
                    stack.pop();
                    stack.push(swapState);
                    stack.push("INSIDE_STRING");
                    pushCurrentKeyToPath();
                    break;
                }
            case "f":
            case "t":
            case "n":
                {
                    lastValidIndex = i;
                    literalStart = i;
                    stack.pop();
                    stack.push(swapState);
                    stack.push("INSIDE_LITERAL");
                    break;
                }
            case "-":
                {
                    stack.pop();
                    stack.push(swapState);
                    stack.push("INSIDE_NUMBER");
                    pushCurrentKeyToPath();
                    break;
                }
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
                {
                    lastValidIndex = i;
                    stack.pop();
                    stack.push(swapState);
                    stack.push("INSIDE_NUMBER");
                    pushCurrentKeyToPath();
                    break;
                }
            case "{":
                {
                    lastValidIndex = i;
                    stack.pop();
                    stack.push(swapState);
                    stack.push("INSIDE_OBJECT_START");
                    pushCurrentKeyToPath();
                    break;
                }
            case "[":
                {
                    lastValidIndex = i;
                    stack.pop();
                    stack.push(swapState);
                    stack.push("INSIDE_ARRAY_START");
                    pushCurrentKeyToPath();
                    break;
                }
        }
    }
    function processAfterObjectValue(char, i) {
        switch(char){
            case ",":
                {
                    stack.pop();
                    stack.push("INSIDE_OBJECT_AFTER_COMMA");
                    break;
                }
            case "}":
                {
                    lastValidIndex = i;
                    stack.pop();
                    currentKey = path.pop();
                    break;
                }
        }
    }
    function processAfterArrayValue(char, i) {
        switch(char){
            case ",":
                {
                    stack.pop();
                    stack.push("INSIDE_ARRAY_AFTER_COMMA");
                    currentKey = (Number(currentKey) + 1).toString();
                    break;
                }
            case "]":
                {
                    lastValidIndex = i;
                    stack.pop();
                    currentKey = path.pop();
                    break;
                }
        }
    }
    for(let i = 0; i < input.length; i++){
        const char = input[i];
        const currentState = stack[stack.length - 1];
        switch(currentState){
            case "ROOT":
                processValueStart(char, i, "FINISH");
                break;
            case "INSIDE_OBJECT_START":
                {
                    switch(char){
                        case '"':
                            {
                                stack.pop();
                                stack.push("INSIDE_OBJECT_KEY");
                                currentKey = "";
                                break;
                            }
                        case "}":
                            {
                                lastValidIndex = i;
                                stack.pop();
                                currentKey = path.pop();
                                break;
                            }
                    }
                    break;
                }
            case "INSIDE_OBJECT_AFTER_COMMA":
                {
                    switch(char){
                        case '"':
                            {
                                stack.pop();
                                stack.push("INSIDE_OBJECT_KEY");
                                currentKey = "";
                                break;
                            }
                    }
                    break;
                }
            case "INSIDE_OBJECT_KEY":
                {
                    switch(char){
                        case '"':
                            {
                                stack.pop();
                                stack.push("INSIDE_OBJECT_AFTER_KEY");
                                break;
                            }
                        case "\\":
                            {
                                stack.push("INSIDE_STRING_ESCAPE");
                                currentKey += char;
                                break;
                            }
                        default:
                            {
                                currentKey += char;
                                break;
                            }
                    }
                    break;
                }
            case "INSIDE_OBJECT_AFTER_KEY":
                {
                    switch(char){
                        case ":":
                            {
                                stack.pop();
                                stack.push("INSIDE_OBJECT_BEFORE_VALUE");
                                break;
                            }
                    }
                    break;
                }
            case "INSIDE_OBJECT_BEFORE_VALUE":
                {
                    processValueStart(char, i, "INSIDE_OBJECT_AFTER_VALUE");
                    break;
                }
            case "INSIDE_OBJECT_AFTER_VALUE":
                {
                    processAfterObjectValue(char, i);
                    break;
                }
            case "INSIDE_STRING":
                {
                    switch(char){
                        case '"':
                            {
                                stack.pop();
                                lastValidIndex = i;
                                currentKey = path.pop();
                                break;
                            }
                        case "\\":
                            {
                                stack.push("INSIDE_STRING_ESCAPE");
                                break;
                            }
                        default:
                            {
                                lastValidIndex = i;
                            }
                    }
                    break;
                }
            case "INSIDE_ARRAY_START":
                {
                    switch(char){
                        case "]":
                            {
                                lastValidIndex = i;
                                stack.pop();
                                currentKey = path.pop();
                                break;
                            }
                        default:
                            {
                                lastValidIndex = i;
                                currentKey = "0";
                                processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
                                break;
                            }
                    }
                    break;
                }
            case "INSIDE_ARRAY_AFTER_VALUE":
                {
                    switch(char){
                        case ",":
                            {
                                stack.pop();
                                stack.push("INSIDE_ARRAY_AFTER_COMMA");
                                currentKey = (Number(currentKey) + 1).toString();
                                break;
                            }
                        case "]":
                            {
                                lastValidIndex = i;
                                stack.pop();
                                currentKey = path.pop();
                                break;
                            }
                        default:
                            {
                                lastValidIndex = i;
                                break;
                            }
                    }
                    break;
                }
            case "INSIDE_ARRAY_AFTER_COMMA":
                {
                    processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
                    break;
                }
            case "INSIDE_STRING_ESCAPE":
                {
                    stack.pop();
                    if (stack[stack.length - 1] === "INSIDE_STRING") {
                        lastValidIndex = i;
                    } else if (stack[stack.length - 1] === "INSIDE_OBJECT_KEY") {
                        currentKey += char;
                    }
                    break;
                }
            case "INSIDE_NUMBER":
                {
                    switch(char){
                        case "0":
                        case "1":
                        case "2":
                        case "3":
                        case "4":
                        case "5":
                        case "6":
                        case "7":
                        case "8":
                        case "9":
                            {
                                lastValidIndex = i;
                                break;
                            }
                        case "e":
                        case "E":
                        case "-":
                        case ".":
                            {
                                break;
                            }
                        case ",":
                            {
                                stack.pop();
                                currentKey = path.pop();
                                if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
                                    processAfterArrayValue(char, i);
                                }
                                if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
                                    processAfterObjectValue(char, i);
                                }
                                break;
                            }
                        case "}":
                            {
                                stack.pop();
                                currentKey = path.pop();
                                if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
                                    processAfterObjectValue(char, i);
                                }
                                break;
                            }
                        case "]":
                            {
                                stack.pop();
                                currentKey = path.pop();
                                if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
                                    processAfterArrayValue(char, i);
                                }
                                break;
                            }
                        default:
                            {
                                stack.pop();
                                currentKey = path.pop();
                                break;
                            }
                    }
                    break;
                }
            case "INSIDE_LITERAL":
                {
                    const partialLiteral = input.substring(literalStart, i + 1);
                    if (!"false".startsWith(partialLiteral) && !"true".startsWith(partialLiteral) && !"null".startsWith(partialLiteral)) {
                        stack.pop();
                        if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
                            processAfterObjectValue(char, i);
                        } else if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
                            processAfterArrayValue(char, i);
                        }
                    } else {
                        lastValidIndex = i;
                    }
                    break;
                }
        }
    }
    let result = input.slice(0, lastValidIndex + 1);
    for(let i = stack.length - 1; i >= 0; i--){
        const state = stack[i];
        switch(state){
            case "INSIDE_STRING":
                {
                    result += '"';
                    break;
                }
            case "INSIDE_OBJECT_KEY":
            case "INSIDE_OBJECT_AFTER_KEY":
            case "INSIDE_OBJECT_AFTER_COMMA":
            case "INSIDE_OBJECT_START":
            case "INSIDE_OBJECT_BEFORE_VALUE":
            case "INSIDE_OBJECT_AFTER_VALUE":
                {
                    result += "}";
                    break;
                }
            case "INSIDE_ARRAY_START":
            case "INSIDE_ARRAY_AFTER_COMMA":
            case "INSIDE_ARRAY_AFTER_VALUE":
                {
                    result += "]";
                    break;
                }
            case "INSIDE_LITERAL":
                {
                    const partialLiteral = input.substring(literalStart, input.length);
                    if ("true".startsWith(partialLiteral)) {
                        result += "true".slice(partialLiteral.length);
                    } else if ("false".startsWith(partialLiteral)) {
                        result += "false".slice(partialLiteral.length);
                    } else if ("null".startsWith(partialLiteral)) {
                        result += "null".slice(partialLiteral.length);
                    }
                }
        }
    }
    return [
        result,
        path
    ];
} //# sourceMappingURL=fix-json.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/json/parse-partial-json-object.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getPartialJsonObjectFieldState",
    ()=>getPartialJsonObjectFieldState,
    "getPartialJsonObjectMeta",
    ()=>getPartialJsonObjectMeta,
    "parsePartialJsonObject",
    ()=>parsePartialJsonObject
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$secure$2d$json$2d$parse$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/secure-json-parse/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$fix$2d$json$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/json/fix-json.js [app-client] (ecmascript)");
;
;
const PARTIAL_JSON_OBJECT_META_SYMBOL = Symbol("aui.parse-partial-json-object.meta");
const getPartialJsonObjectMeta = (obj)=>{
    return obj?.[PARTIAL_JSON_OBJECT_META_SYMBOL];
};
const parsePartialJsonObject = (json)=>{
    if (json.length === 0) return {
        [PARTIAL_JSON_OBJECT_META_SYMBOL]: {
            state: "partial",
            partialPath: []
        }
    };
    try {
        const res = __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$secure$2d$json$2d$parse$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].parse(json);
        if (typeof res !== "object" || res === null) throw new Error("argsText is expected to be an object");
        res[PARTIAL_JSON_OBJECT_META_SYMBOL] = {
            state: "complete",
            partialPath: []
        };
        return res;
    } catch  {
        try {
            const [fixedJson, partialPath] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$fix$2d$json$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fixJson"])(json);
            const res = __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$secure$2d$json$2d$parse$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].parse(fixedJson);
            if (typeof res !== "object" || res === null) throw new Error("argsText is expected to be an object");
            res[PARTIAL_JSON_OBJECT_META_SYMBOL] = {
                state: "partial",
                partialPath
            };
            return res;
        } catch  {
            return undefined;
        }
    }
};
const getFieldState = (parent, parentMeta, fieldPath)=>{
    if (typeof parent !== "object" || parent === null) return parentMeta.state;
    // 1) parent is complete: return "complete"
    if (parentMeta.state === "complete") return "complete";
    // 2) we finished traversing: return parent state
    if (fieldPath.length === 0) return parentMeta.state;
    const [field, ...restPath] = fieldPath;
    // 3) field doesn't yet exist in parent: return "partial"
    if (!Object.prototype.hasOwnProperty.call(parent, field)) return "partial";
    const [partialField, ...restPartialPath] = parentMeta.partialPath;
    // 4) field exists but is not partial: return "complete"
    if (field !== partialField) return "complete";
    // 5) field exists and is partial: return child state
    const child = parent[field];
    const childMeta = {
        state: "partial",
        partialPath: restPartialPath
    };
    return getFieldState(child, childMeta, restPath);
};
const getPartialJsonObjectFieldState = (obj, fieldPath)=>{
    const meta = getPartialJsonObjectMeta(obj);
    if (!meta) throw new Error("unable to determine object state");
    return getFieldState(obj, meta, fieldPath.map(String));
}; //# sourceMappingURL=parse-partial-json-object.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/ToolResponse.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ToolResponse",
    ()=>ToolResponse
]);
const TOOL_RESPONSE_SYMBOL = Symbol.for("aui.tool-response");
class ToolResponse {
    get [TOOL_RESPONSE_SYMBOL]() {
        return true;
    }
    artifact;
    result;
    isError;
    constructor(options){
        if (options.artifact !== undefined) {
            this.artifact = options.artifact;
        }
        this.result = options.result;
        this.isError = options.isError ?? false;
    }
    static [Symbol.hasInstance](obj) {
        return typeof obj === "object" && obj !== null && TOOL_RESPONSE_SYMBOL in obj;
    }
    static toResponse(result) {
        if (result instanceof ToolResponse) {
            return result;
        }
        return new ToolResponse({
            result: result === undefined ? "<no result>" : result
        });
    }
} //# sourceMappingURL=ToolResponse.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/AssistantStream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AssistantStream",
    ()=>AssistantStream
]);
const AssistantStream = {
    toResponse (stream, transformer) {
        return new Response(AssistantStream.toByteStream(stream, transformer), {
            headers: transformer.headers ?? {}
        });
    },
    fromResponse (response, transformer) {
        return AssistantStream.fromByteStream(response.body, transformer);
    },
    toByteStream (stream, transformer) {
        return stream.pipeThrough(transformer);
    },
    fromByteStream (readable, transformer) {
        return readable.pipeThrough(transformer);
    }
}; //# sourceMappingURL=AssistantStream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/promiseWithResolvers.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "promiseWithResolvers",
    ()=>promiseWithResolvers
]);
const promiseWithResolvers = function() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{
        resolve = res;
        reject = rej;
    });
    if (!resolve || !reject) throw new Error("Failed to create promise");
    return {
        promise,
        resolve,
        reject
    };
}; //# sourceMappingURL=promiseWithResolvers.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/merge.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createMergeStream",
    ()=>createMergeStream
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$promiseWithResolvers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/promiseWithResolvers.js [app-client] (ecmascript)");
;
const createMergeStream = ()=>{
    const list = [];
    let sealed = false;
    let controller;
    let currentPull;
    const handlePull = (item)=>{
        if (!item.promise) {
            // TODO for most streams, we can directly pipeTo to avoid the microTask queue
            // add an option to eagerly pipe the stream to the merge stream
            // ideally, using assistant-stream w sync run method + piping to a sync WritableStream runs in the same microtask
            // this is useful because we often use AssistantStreams internally as a serialization utility, e. g. AssistantTransformStream
            // idea: avoid reader.read() by instead using a WritableStream & if (!hasPendingPull) await waitForPull()?
            item.promise = item.reader.read().then(({ done, value })=>{
                item.promise = undefined;
                if (done) {
                    list.splice(list.indexOf(item), 1);
                    if (sealed && list.length === 0) {
                        controller.close();
                    }
                } else {
                    controller.enqueue(value);
                }
                currentPull?.resolve();
                currentPull = undefined;
            }).catch((e)=>{
                console.error(e);
                list.forEach((item)=>{
                    item.reader.cancel();
                });
                list.length = 0;
                controller.error(e);
                currentPull?.reject(e);
                currentPull = undefined;
            });
        }
    };
    const readable = new ReadableStream({
        start (c) {
            controller = c;
        },
        pull () {
            currentPull = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$promiseWithResolvers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["promiseWithResolvers"])();
            list.forEach((item)=>{
                handlePull(item);
            });
            return currentPull.promise;
        },
        cancel () {
            list.forEach((item)=>{
                item.reader.cancel();
            });
            list.length = 0;
        }
    });
    return {
        readable,
        isSealed () {
            return sealed;
        },
        seal () {
            sealed = true;
            if (list.length === 0) controller.close();
        },
        addStream (stream) {
            if (sealed) throw new Error("Cannot add streams after the run callback has settled.");
            const item = {
                reader: stream.getReader()
            };
            list.push(item);
            handlePull(item);
        },
        enqueue (chunk) {
            this.addStream(new ReadableStream({
                start (c) {
                    c.enqueue(chunk);
                    c.close();
                }
            }));
        }
    };
}; // TODO
 // export class SpanContainerMerger {
 //   public get isSealed() {
 //     return this.mergeStream.isSealed();
 //   }
 //   public get readable() {
 //     return this.mergeStream.readable;
 //   }
 //   private subAllocator = new Counter();
 //   private mergeStream = createMergeStream();
 //   constructor() {
 //     // id 0 is auto allocated
 //     this.subAllocator.up();
 //   }
 //   add(stream: ReadableStream<AssistantStreamChunk>) {
 //     this.mergeStream.addStream(
 //       stream.pipeThrough(new SpanParentEncoder(this.subAllocator)),
 //     );
 //   }
 //   enqueue(chunk: AssistantStreamChunk & { parentId: 0 }) {
 //     this.mergeStream.addStream(
 //       new ReadableStream({
 //         start(c) {
 //           c.enqueue(chunk);
 //           c.close();
 //         },
 //       }),
 //     );
 //   }
 //   seal() {
 //     this.mergeStream.seal();
 //   }
 // }
 // export class SpanContainerSplitter {
 //   public writable;
 //   private isSealed = false;
 //   private writers = new Map<
 //     number,
 //     WritableStreamDefaultWriter<AssistantStreamChunk>
 //   >();
 //   private closeTasks: Promise<void>[] = [];
 //   private allocator = new Counter();
 //   private subAllocator = new Counter();
 //   constructor() {
 //     // id 0 is auto-allocated
 //     this.allocator.up();
 //     this.writable = new WritableStream({
 //       write: (chunk) => {
 //         const { type, parentId } = chunk;
 //         const writer = this.writers.get(parentId);
 //         if (writer === undefined) throw new Error("Parent id not found");
 //         writer.write(chunk);
 //         if (type === "span") {
 //           // allocate a new span id
 //           this.writers.set(this.allocator.up(), writer);
 //         }
 //         if (type === "finish") {
 //           this.writers.delete(parentId);
 //           writer.close();
 //           if (this.writers.size === 0) {
 //             const closeTask = this.writable.close();
 //             this.closeTasks.push(closeTask);
 //             closeTask.then(() => {
 //               this.closeTasks.splice(this.closeTasks.indexOf(closeTask), 1);
 //             });
 //           }
 //         }
 //       },
 //       close: async () => {
 //         if (this.writers.size > 0) throw new Error("Not all writers closed");
 //         // await and throw on any errors
 //         await Promise.all(this.closeTasks);
 //       },
 //     });
 //   }
 //   add(stream: WritableStream<AssistantStreamChunk>) {
 //     if (this.isSealed) throw new Error("Cannot add streams after sealing");
 //     const decoder = new SpanParentDecoder(this.subAllocator);
 //     decoder.readable.pipeTo(stream);
 //     this.writers.set(this.allocator.up(), decoder.writable.getWriter());
 //   }
 //   seal() {
 //     this.isSealed = true;
 //     if (this.writers.size === 0) this.writable.close();
 //   }
 // }
 //# sourceMappingURL=merge.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/modules/text.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createTextStream",
    ()=>createTextStream,
    "createTextStreamController",
    ()=>createTextStreamController
]);
class TextStreamControllerImpl {
    _controller;
    _isClosed = false;
    constructor(controller){
        this._controller = controller;
    }
    append(textDelta) {
        this._controller.enqueue({
            type: "text-delta",
            path: [],
            textDelta
        });
        return this;
    }
    close() {
        if (this._isClosed) return;
        this._isClosed = true;
        this._controller.enqueue({
            type: "part-finish",
            path: []
        });
        this._controller.close();
    }
}
const createTextStream = (readable)=>{
    return new ReadableStream({
        start (c) {
            return readable.start?.(new TextStreamControllerImpl(c));
        },
        pull (c) {
            return readable.pull?.(new TextStreamControllerImpl(c));
        },
        cancel (c) {
            return readable.cancel?.(c);
        }
    });
};
const createTextStreamController = ()=>{
    let controller;
    const stream = createTextStream({
        start (c) {
            controller = c;
        }
    });
    return [
        stream,
        controller
    ];
}; //# sourceMappingURL=text.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/modules/tool-call.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createToolCallStream",
    ()=>createToolCallStream,
    "createToolCallStreamController",
    ()=>createToolCallStreamController
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/modules/text.js [app-client] (ecmascript)");
;
class ToolCallStreamControllerImpl {
    _controller;
    _isClosed = false;
    _mergeTask;
    constructor(_controller){
        this._controller = _controller;
        const stream = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createTextStream"])({
            start: (c)=>{
                this._argsTextController = c;
            }
        });
        let hasArgsText = false;
        this._mergeTask = stream.pipeTo(new WritableStream({
            write: (chunk)=>{
                switch(chunk.type){
                    case "text-delta":
                        hasArgsText = true;
                        this._controller.enqueue(chunk);
                        break;
                    case "part-finish":
                        if (!hasArgsText) {
                            // if no argsText was provided, assume empty object
                            this._controller.enqueue({
                                type: "text-delta",
                                textDelta: "{}",
                                path: []
                            });
                        }
                        this._controller.enqueue({
                            type: "tool-call-args-text-finish",
                            path: []
                        });
                        break;
                    default:
                        throw new Error(`Unexpected chunk type: ${chunk.type}`);
                }
            }
        }));
    }
    get argsText() {
        return this._argsTextController;
    }
    _argsTextController;
    async setResponse(response) {
        this._argsTextController.close();
        await Promise.resolve(); // flush microtask queue
        // TODO switch argsTextController to be something that doesn'#t require this
        this._controller.enqueue({
            type: "result",
            path: [],
            ...response.artifact !== undefined ? {
                artifact: response.artifact
            } : {},
            result: response.result,
            isError: response.isError ?? false
        });
    }
    async close() {
        if (this._isClosed) return;
        this._isClosed = true;
        this._argsTextController.close();
        await this._mergeTask;
        this._controller.enqueue({
            type: "part-finish",
            path: []
        });
        this._controller.close();
    }
}
const createToolCallStream = (readable)=>{
    return new ReadableStream({
        start (c) {
            return readable.start?.(new ToolCallStreamControllerImpl(c));
        },
        pull (c) {
            return readable.pull?.(new ToolCallStreamControllerImpl(c));
        },
        cancel (c) {
            return readable.cancel?.(c);
        }
    });
};
const createToolCallStreamController = ()=>{
    let controller;
    const stream = createToolCallStream({
        start (c) {
            controller = c;
        }
    });
    return [
        stream,
        controller
    ];
}; //# sourceMappingURL=tool-call.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/Counter.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Counter",
    ()=>Counter
]);
class Counter {
    value = -1;
    up() {
        return ++this.value;
    }
} //# sourceMappingURL=Counter.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/path-utils.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PathAppendDecoder",
    ()=>PathAppendDecoder,
    "PathAppendEncoder",
    ()=>PathAppendEncoder,
    "PathMergeEncoder",
    ()=>PathMergeEncoder
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$Counter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/Counter.js [app-client] (ecmascript)");
;
class PathAppendEncoder extends TransformStream {
    constructor(idx){
        super({
            transform (chunk, controller) {
                controller.enqueue({
                    ...chunk,
                    path: [
                        idx,
                        ...chunk.path
                    ]
                });
            }
        });
    }
}
class PathAppendDecoder extends TransformStream {
    constructor(idx){
        super({
            transform (chunk, controller) {
                const { path: [idx2, ...path] } = chunk;
                if (idx !== idx2) throw new Error(`Path mismatch: expected ${idx}, got ${idx2}`);
                controller.enqueue({
                    ...chunk,
                    path
                });
            }
        });
    }
}
class PathMergeEncoder extends TransformStream {
    constructor(counter){
        const innerCounter = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$Counter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Counter"]();
        const mapping = new Map();
        super({
            transform (chunk, controller) {
                if (chunk.type === "part-start" && chunk.path.length === 0) {
                    mapping.set(innerCounter.up(), counter.up());
                }
                const [idx, ...path] = chunk.path;
                if (idx === undefined) {
                    controller.enqueue(chunk);
                    return;
                }
                const mappedIdx = mapping.get(idx);
                if (mappedIdx === undefined) throw new Error("Path not found");
                controller.enqueue({
                    ...chunk,
                    path: [
                        mappedIdx,
                        ...path
                    ]
                });
            }
        });
    }
} //# sourceMappingURL=path-utils.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/AssistantTransformStream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AssistantTransformStream",
    ()=>AssistantTransformStream
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$assistant$2d$stream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/modules/assistant-stream.js [app-client] (ecmascript)");
;
class AssistantTransformStream extends TransformStream {
    constructor(transformer, writableStrategy, readableStrategy){
        const [stream, runController] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$assistant$2d$stream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createAssistantStreamController"])();
        let runPipeTask;
        super({
            start (controller) {
                runPipeTask = stream.pipeTo(new WritableStream({
                    write (chunk) {
                        controller.enqueue(chunk);
                    },
                    abort (reason) {
                        controller.error(reason);
                    },
                    close () {
                        controller.terminate();
                    }
                })).catch((error)=>{
                    controller.error(error);
                });
                return transformer.start?.(runController);
            },
            transform (chunk) {
                return transformer.transform?.(chunk, runController);
            },
            async flush () {
                await transformer.flush?.(runController);
                runController.close();
                await runPipeTask;
            }
        }, writableStrategy, readableStrategy);
    }
} //# sourceMappingURL=AssistantTransformStream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/PipeableTransformStream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PipeableTransformStream",
    ()=>PipeableTransformStream
]);
class PipeableTransformStream extends TransformStream {
    constructor(transform){
        super();
        const readable = transform(super.readable);
        Object.defineProperty(this, "readable", {
            value: readable,
            writable: false
        });
    }
} //# sourceMappingURL=PipeableTransformStream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/serialization/data-stream/chunk-types.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DataStreamStreamChunkType",
    ()=>DataStreamStreamChunkType
]);
var DataStreamStreamChunkType;
(function(DataStreamStreamChunkType) {
    DataStreamStreamChunkType["TextDelta"] = "0";
    DataStreamStreamChunkType["Data"] = "2";
    DataStreamStreamChunkType["Error"] = "3";
    DataStreamStreamChunkType["Annotation"] = "8";
    DataStreamStreamChunkType["ToolCall"] = "9";
    DataStreamStreamChunkType["ToolCallResult"] = "a";
    DataStreamStreamChunkType["StartToolCall"] = "b";
    DataStreamStreamChunkType["ToolCallArgsTextDelta"] = "c";
    DataStreamStreamChunkType["FinishMessage"] = "d";
    DataStreamStreamChunkType["FinishStep"] = "e";
    DataStreamStreamChunkType["StartStep"] = "f";
    DataStreamStreamChunkType["ReasoningDelta"] = "g";
    DataStreamStreamChunkType["Source"] = "h";
    DataStreamStreamChunkType["RedactedReasoning"] = "i";
    DataStreamStreamChunkType["ReasoningSignature"] = "j";
    DataStreamStreamChunkType["File"] = "k";
    DataStreamStreamChunkType["AuiUpdateStateOperations"] = "aui-state";
    DataStreamStreamChunkType["AuiTextDelta"] = "aui-text-delta";
    DataStreamStreamChunkType["AuiReasoningDelta"] = "aui-reasoning-delta";
})(DataStreamStreamChunkType || (DataStreamStreamChunkType = {})); //# sourceMappingURL=chunk-types.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/LineDecoderStream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LineDecoderStream",
    ()=>LineDecoderStream
]);
class LineDecoderStream extends TransformStream {
    buffer = "";
    constructor(){
        super({
            transform: (chunk, controller)=>{
                this.buffer += chunk;
                const lines = this.buffer.split("\n");
                // Process all complete lines
                for(let i = 0; i < lines.length - 1; i++){
                    controller.enqueue(lines[i]);
                }
                // Keep the last incomplete line in the buffer
                this.buffer = lines[lines.length - 1] || "";
            },
            flush: ()=>{
                // If there's content in the buffer when the stream ends, it means
                // the stream ended with an incomplete line (no trailing newline)
                if (this.buffer) {
                    throw new Error(`Stream ended with an incomplete line: "${this.buffer}"`);
                }
            }
        });
    }
} //# sourceMappingURL=LineDecoderStream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/serialization/data-stream/serialization.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DataStreamChunkDecoder",
    ()=>DataStreamChunkDecoder,
    "DataStreamChunkEncoder",
    ()=>DataStreamChunkEncoder
]);
class DataStreamChunkEncoder extends TransformStream {
    constructor(){
        super({
            transform: (chunk, controller)=>{
                controller.enqueue(`${chunk.type}:${JSON.stringify(chunk.value)}\n`);
            }
        });
    }
}
class DataStreamChunkDecoder extends TransformStream {
    constructor(){
        super({
            transform: (chunk, controller)=>{
                const index = chunk.indexOf(":");
                if (index === -1) throw new Error("Invalid stream part");
                controller.enqueue({
                    type: chunk.slice(0, index),
                    value: JSON.parse(chunk.slice(index + 1))
                });
            }
        });
    }
} //# sourceMappingURL=serialization.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/AssistantMetaTransformStream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AssistantMetaTransformStream",
    ()=>AssistantMetaTransformStream
]);
class AssistantMetaTransformStream extends TransformStream {
    constructor(){
        // We use an array to record parts as they are introduced.
        const parts = [];
        super({
            transform (chunk, controller) {
                // For chunks that introduce a new part.
                if (chunk.type === "part-start") {
                    if (chunk.path.length !== 0) {
                        controller.error(new Error("Nested parts are not supported"));
                        return;
                    }
                    parts.push(chunk.part);
                    controller.enqueue(chunk);
                    return;
                }
                // For chunks that expect an associated part.
                if (chunk.type === "text-delta" || chunk.type === "result" || chunk.type === "part-finish" || chunk.type === "tool-call-args-text-finish") {
                    if (chunk.path.length !== 1) {
                        controller.error(new Error(`${chunk.type} chunks must have a path of length 1`));
                        return;
                    }
                    const idx = chunk.path[0];
                    if (idx < 0 || idx >= parts.length) {
                        controller.error(new Error(`Invalid path index: ${idx}`));
                        return;
                    }
                    const part = parts[idx];
                    controller.enqueue({
                        ...chunk,
                        meta: part
                    });
                    return;
                }
                controller.enqueue(chunk);
            }
        });
    }
} //# sourceMappingURL=AssistantMetaTransformStream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/serialization/data-stream/DataStream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DataStreamDecoder",
    ()=>DataStreamDecoder,
    "DataStreamEncoder",
    ()=>DataStreamEncoder
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$AssistantTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/AssistantTransformStream.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$PipeableTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/PipeableTransformStream.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/serialization/data-stream/chunk-types.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$LineDecoderStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/LineDecoderStream.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$serialization$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/serialization/data-stream/serialization.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$AssistantMetaTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/AssistantMetaTransformStream.js [app-client] (ecmascript)");
;
;
;
;
;
;
class DataStreamEncoder extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$PipeableTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PipeableTransformStream"] {
    headers = new Headers({
        "Content-Type": "text/plain; charset=utf-8",
        "x-vercel-ai-data-stream": "v1"
    });
    constructor(){
        super((readable)=>{
            const transform = new TransformStream({
                transform (chunk, controller) {
                    const type = chunk.type;
                    switch(type){
                        case "part-start":
                            {
                                const part = chunk.part;
                                if (part.type === "tool-call") {
                                    const { type, ...value } = part;
                                    controller.enqueue({
                                        type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].StartToolCall,
                                        value
                                    });
                                }
                                if (part.type === "source") {
                                    const { type, ...value } = part;
                                    controller.enqueue({
                                        type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Source,
                                        value
                                    });
                                }
                                break;
                            }
                        case "text-delta":
                            {
                                const part = chunk.meta;
                                switch(part.type){
                                    case "text":
                                        {
                                            if (part.parentId) {
                                                controller.enqueue({
                                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].AuiTextDelta,
                                                    value: {
                                                        textDelta: chunk.textDelta,
                                                        parentId: part.parentId
                                                    }
                                                });
                                            } else {
                                                controller.enqueue({
                                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].TextDelta,
                                                    value: chunk.textDelta
                                                });
                                            }
                                            break;
                                        }
                                    case "reasoning":
                                        {
                                            if (part.parentId) {
                                                controller.enqueue({
                                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].AuiReasoningDelta,
                                                    value: {
                                                        reasoningDelta: chunk.textDelta,
                                                        parentId: part.parentId
                                                    }
                                                });
                                            } else {
                                                controller.enqueue({
                                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ReasoningDelta,
                                                    value: chunk.textDelta
                                                });
                                            }
                                            break;
                                        }
                                    case "tool-call":
                                        {
                                            controller.enqueue({
                                                type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ToolCallArgsTextDelta,
                                                value: {
                                                    toolCallId: part.toolCallId,
                                                    argsTextDelta: chunk.textDelta
                                                }
                                            });
                                            break;
                                        }
                                    default:
                                        throw new Error(`Unsupported part type for text-delta: ${part.type}`);
                                }
                                break;
                            }
                        case "result":
                            {
                                // Only tool-call parts can have results.
                                const part = chunk.meta;
                                if (part.type !== "tool-call") {
                                    throw new Error(`Result chunk on non-tool-call part not supported: ${part.type}`);
                                }
                                controller.enqueue({
                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ToolCallResult,
                                    value: {
                                        toolCallId: part.toolCallId,
                                        result: chunk.result,
                                        artifact: chunk.artifact,
                                        ...chunk.isError ? {
                                            isError: chunk.isError
                                        } : {}
                                    }
                                });
                                break;
                            }
                        case "step-start":
                            {
                                const { type, ...value } = chunk;
                                controller.enqueue({
                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].StartStep,
                                    value
                                });
                                break;
                            }
                        case "step-finish":
                            {
                                const { type, ...value } = chunk;
                                controller.enqueue({
                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].FinishStep,
                                    value
                                });
                                break;
                            }
                        case "message-finish":
                            {
                                const { type, ...value } = chunk;
                                controller.enqueue({
                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].FinishMessage,
                                    value
                                });
                                break;
                            }
                        case "error":
                            {
                                controller.enqueue({
                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Error,
                                    value: chunk.error
                                });
                                break;
                            }
                        case "annotations":
                            {
                                controller.enqueue({
                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Annotation,
                                    value: chunk.annotations
                                });
                                break;
                            }
                        case "data":
                            {
                                controller.enqueue({
                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Data,
                                    value: chunk.data
                                });
                                break;
                            }
                        case "update-state":
                            {
                                controller.enqueue({
                                    type: __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].AuiUpdateStateOperations,
                                    value: chunk.operations
                                });
                                break;
                            }
                        // TODO ignore for now
                        // in the future, we should create a handler that waits for text parts to finish before continuing
                        case "tool-call-args-text-finish":
                        case "part-finish":
                            break;
                        default:
                            {
                                const exhaustiveCheck = type;
                                throw new Error(`Unsupported chunk type: ${exhaustiveCheck}`);
                            }
                    }
                }
            });
            return readable.pipeThrough(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$AssistantMetaTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AssistantMetaTransformStream"]()).pipeThrough(transform).pipeThrough(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$serialization$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamChunkEncoder"]()).pipeThrough(new TextEncoderStream());
        });
    }
}
const TOOL_CALL_ARGS_CLOSING_CHUNKS = [
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].StartToolCall,
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ToolCall,
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].TextDelta,
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ReasoningDelta,
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Source,
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Error,
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].FinishStep,
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].FinishMessage,
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].AuiTextDelta,
    __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].AuiReasoningDelta
];
class DataStreamDecoder extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$PipeableTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PipeableTransformStream"] {
    constructor(){
        super((readable)=>{
            const toolCallControllers = new Map();
            let activeToolCallArgsText;
            const transform = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$AssistantTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AssistantTransformStream"]({
                transform (chunk, controller) {
                    const { type, value } = chunk;
                    if (TOOL_CALL_ARGS_CLOSING_CHUNKS.includes(type)) {
                        activeToolCallArgsText?.close();
                        activeToolCallArgsText = undefined;
                    }
                    switch(type){
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ReasoningDelta:
                            controller.appendReasoning(value);
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].TextDelta:
                            controller.appendText(value);
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].AuiTextDelta:
                            controller.withParentId(value.parentId).appendText(value.textDelta);
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].AuiReasoningDelta:
                            controller.withParentId(value.parentId).appendReasoning(value.reasoningDelta);
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].StartToolCall:
                            {
                                const { toolCallId, toolName, parentId } = value;
                                const ctrl = parentId ? controller.withParentId(parentId) : controller;
                                if (toolCallControllers.has(toolCallId)) throw new Error(`Encountered duplicate tool call id: ${toolCallId}`);
                                const toolCallController = ctrl.addToolCallPart({
                                    toolCallId,
                                    toolName
                                });
                                toolCallControllers.set(toolCallId, toolCallController);
                                activeToolCallArgsText = toolCallController.argsText;
                                break;
                            }
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ToolCallArgsTextDelta:
                            {
                                const { toolCallId, argsTextDelta } = value;
                                const toolCallController = toolCallControllers.get(toolCallId);
                                if (!toolCallController) throw new Error(`Encountered tool call with unknown id: ${toolCallId}`);
                                toolCallController.argsText.append(argsTextDelta);
                                break;
                            }
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ToolCallResult:
                            {
                                const { toolCallId, artifact, result, isError } = value;
                                const toolCallController = toolCallControllers.get(toolCallId);
                                if (!toolCallController) throw new Error(`Encountered tool call result with unknown id: ${toolCallId}`);
                                toolCallController.setResponse({
                                    artifact,
                                    result,
                                    isError
                                });
                                break;
                            }
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ToolCall:
                            {
                                const { toolCallId, toolName, args } = value;
                                let toolCallController = toolCallControllers.get(toolCallId);
                                if (toolCallController) {
                                    toolCallController.argsText.close();
                                } else {
                                    toolCallController = controller.addToolCallPart({
                                        toolCallId,
                                        toolName,
                                        args
                                    });
                                    toolCallControllers.set(toolCallId, toolCallController);
                                }
                                break;
                            }
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].FinishMessage:
                            controller.enqueue({
                                type: "message-finish",
                                path: [],
                                ...value
                            });
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].StartStep:
                            controller.enqueue({
                                type: "step-start",
                                path: [],
                                ...value
                            });
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].FinishStep:
                            controller.enqueue({
                                type: "step-finish",
                                path: [],
                                ...value
                            });
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Data:
                            controller.enqueue({
                                type: "data",
                                path: [],
                                data: value
                            });
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Annotation:
                            controller.enqueue({
                                type: "annotations",
                                path: [],
                                annotations: value
                            });
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Source:
                            {
                                const { parentId, ...sourceData } = value;
                                const ctrl = parentId ? controller.withParentId(parentId) : controller;
                                ctrl.appendSource({
                                    type: "source",
                                    ...sourceData
                                });
                                break;
                            }
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].Error:
                            controller.enqueue({
                                type: "error",
                                path: [],
                                error: value
                            });
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].File:
                            controller.appendFile({
                                type: "file",
                                ...value
                            });
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].AuiUpdateStateOperations:
                            controller.enqueue({
                                type: "update-state",
                                path: [],
                                operations: value
                            });
                            break;
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].ReasoningSignature:
                        case __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$chunk$2d$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamStreamChunkType"].RedactedReasoning:
                            break;
                        default:
                            {
                                const exhaustiveCheck = type;
                                throw new Error(`unsupported chunk type: ${exhaustiveCheck}`);
                            }
                    }
                },
                flush () {
                    activeToolCallArgsText?.close();
                    activeToolCallArgsText = undefined;
                    toolCallControllers.forEach((controller)=>controller.close());
                    toolCallControllers.clear();
                }
            });
            return readable.pipeThrough(new TextDecoderStream()).pipeThrough(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$LineDecoderStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LineDecoderStream"]()).pipeThrough(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$serialization$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamChunkDecoder"]()).pipeThrough(transform);
        });
    }
} //# sourceMappingURL=DataStream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/generateId.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateId",
    ()=>generateId
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$nanoid$2f$non$2d$secure$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/nanoid/non-secure/index.js [app-client] (ecmascript)");
;
const generateId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$nanoid$2f$non$2d$secure$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["customAlphabet"])("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 7); //# sourceMappingURL=generateId.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/modules/assistant-stream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAssistantStream",
    ()=>createAssistantStream,
    "createAssistantStreamController",
    ()=>createAssistantStreamController,
    "createAssistantStreamResponse",
    ()=>createAssistantStreamResponse
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$AssistantStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/AssistantStream.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$merge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/merge.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/modules/text.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$tool$2d$call$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/modules/tool-call.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$Counter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/Counter.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$path$2d$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/path-utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$DataStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/serialization/data-stream/DataStream.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$generateId$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/generateId.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$promiseWithResolvers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/promiseWithResolvers.js [app-client] (ecmascript)");
;
;
;
;
;
;
;
;
;
class AssistantStreamControllerImpl {
    _state;
    _parentId;
    constructor(state){
        this._state = state || {
            merger: (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$merge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createMergeStream"])(),
            contentCounter: new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$Counter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Counter"]()
        };
    }
    get __internal_isClosed() {
        return this._state.merger.isSealed();
    }
    __internal_getReadable() {
        return this._state.merger.readable;
    }
    __internal_subscribeToClose(callback) {
        this._state.closeSubscriber = callback;
    }
    _addPart(part, stream) {
        if (this._state.append) {
            this._state.append.controller.close();
            this._state.append = undefined;
        }
        this.enqueue({
            type: "part-start",
            part,
            path: []
        });
        this._state.merger.addStream(stream.pipeThrough(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$path$2d$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PathAppendEncoder"](this._state.contentCounter.value)));
    }
    merge(stream) {
        this._state.merger.addStream(stream.pipeThrough(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$path$2d$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PathMergeEncoder"](this._state.contentCounter)));
    }
    appendText(textDelta) {
        if (this._state.append?.kind !== "text") {
            this._state.append = {
                kind: "text",
                controller: this.addTextPart()
            };
        }
        this._state.append.controller.append(textDelta);
    }
    appendReasoning(textDelta) {
        if (this._state.append?.kind !== "reasoning") {
            this._state.append = {
                kind: "reasoning",
                controller: this.addReasoningPart()
            };
        }
        this._state.append.controller.append(textDelta);
    }
    addTextPart() {
        const [stream, controller] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createTextStreamController"])();
        this._addPart({
            type: "text"
        }, stream);
        return controller;
    }
    addReasoningPart() {
        const [stream, controller] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createTextStreamController"])();
        this._addPart({
            type: "reasoning"
        }, stream);
        return controller;
    }
    addToolCallPart(options) {
        const opt = typeof options === "string" ? {
            toolName: options
        } : options;
        const toolName = opt.toolName;
        const toolCallId = opt.toolCallId ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$generateId$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateId"])();
        const [stream, controller] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$modules$2f$tool$2d$call$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createToolCallStreamController"])();
        this._addPart({
            type: "tool-call",
            toolName,
            toolCallId,
            ...this._parentId && {
                parentId: this._parentId
            }
        }, stream);
        if (opt.argsText !== undefined) {
            controller.argsText.append(opt.argsText);
            controller.argsText.close();
        }
        if (opt.args !== undefined) {
            controller.argsText.append(JSON.stringify(opt.args));
            controller.argsText.close();
        }
        if (opt.response !== undefined) {
            controller.setResponse(opt.response);
        }
        return controller;
    }
    appendSource(options) {
        this._addPart({
            ...options,
            ...this._parentId && {
                parentId: this._parentId
            }
        }, new ReadableStream({
            start (controller) {
                controller.enqueue({
                    type: "part-finish",
                    path: []
                });
                controller.close();
            }
        }));
    }
    appendFile(options) {
        this._addPart(options, new ReadableStream({
            start (controller) {
                controller.enqueue({
                    type: "part-finish",
                    path: []
                });
                controller.close();
            }
        }));
    }
    enqueue(chunk) {
        this._state.merger.enqueue(chunk);
        if (chunk.type === "part-start" && chunk.path.length === 0) {
            this._state.contentCounter.up();
        }
    }
    withParentId(parentId) {
        const controller = new AssistantStreamControllerImpl(this._state);
        controller._parentId = parentId;
        return controller;
    }
    close() {
        this._state.append?.controller?.close();
        this._state.merger.seal();
        this._state.closeSubscriber?.();
    }
}
function createAssistantStream(callback) {
    const controller = new AssistantStreamControllerImpl();
    const runTask = async ()=>{
        try {
            await callback(controller);
        } catch (e) {
            if (!controller.__internal_isClosed) {
                controller.enqueue({
                    type: "error",
                    path: [],
                    error: String(e)
                });
            }
            throw e;
        } finally{
            if (!controller.__internal_isClosed) {
                controller.close();
            }
        }
    };
    runTask();
    return controller.__internal_getReadable();
}
function createAssistantStreamController() {
    const { resolve, promise } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$promiseWithResolvers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["promiseWithResolvers"])();
    let controller;
    const stream = createAssistantStream((c)=>{
        controller = c;
        controller.__internal_subscribeToClose(resolve);
        return promise;
    });
    return [
        stream,
        controller
    ];
}
function createAssistantStreamResponse(callback) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$AssistantStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AssistantStream"].toResponse(createAssistantStream(callback), new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$serialization$2f$data$2d$stream$2f$DataStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStreamEncoder"]());
} //# sourceMappingURL=assistant-stream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/withPromiseOrValue.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "withPromiseOrValue",
    ()=>withPromiseOrValue
]);
function withPromiseOrValue(callback, thenHandler, catchHandler) {
    try {
        const promiseOrValue = callback();
        if (typeof promiseOrValue === "object" && promiseOrValue !== null && "then" in promiseOrValue) {
            return promiseOrValue.then(thenHandler, catchHandler);
        } else {
            thenHandler(promiseOrValue);
        }
    } catch (e) {
        catchHandler(e);
    }
} //# sourceMappingURL=withPromiseOrValue.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/AsyncIterableStream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "asAsyncIterableStream",
    ()=>asAsyncIterableStream
]);
async function* streamGeneratorPolyfill() {
    const reader = this.getReader();
    try {
        while(true){
            const { done, value } = await reader.read();
            if (done) break;
            yield value;
        }
    } finally{
        reader.releaseLock();
    }
}
function asAsyncIterableStream(source) {
    source[Symbol.asyncIterator] ??= streamGeneratorPolyfill;
    return source;
} //# sourceMappingURL=AsyncIterableStream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/ToolCallReader.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ToolCallArgsReaderImpl",
    ()=>ToolCallArgsReaderImpl,
    "ToolCallReaderImpl",
    ()=>ToolCallReaderImpl,
    "ToolCallResponseReaderImpl",
    ()=>ToolCallResponseReaderImpl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$promiseWithResolvers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/promiseWithResolvers.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/json/parse-partial-json-object.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$AsyncIterableStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/utils/AsyncIterableStream.js [app-client] (ecmascript)");
;
;
;
// TODO: remove dispose
function getField(obj, fieldPath) {
    let current = obj;
    for (const key of fieldPath){
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[key];
    }
    return current;
}
class GetHandle {
    resolve;
    reject;
    disposed = false;
    fieldPath;
    constructor(resolve, reject, fieldPath){
        this.resolve = resolve;
        this.reject = reject;
        this.fieldPath = fieldPath;
    }
    update(args) {
        if (this.disposed) return;
        try {
            // Check if the field is complete
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPartialJsonObjectFieldState"])(args, this.fieldPath) === "complete") {
                const value = getField(args, this.fieldPath);
                if (value !== undefined) {
                    this.resolve(value);
                    this.dispose();
                }
            }
        } catch (e) {
            this.reject(e);
            this.dispose();
        }
    }
    dispose() {
        this.disposed = true;
    }
}
class StreamValuesHandle {
    controller;
    disposed = false;
    fieldPath;
    constructor(controller, fieldPath){
        this.controller = controller;
        this.fieldPath = fieldPath;
    }
    update(args) {
        if (this.disposed) return;
        try {
            const value = getField(args, this.fieldPath);
            if (value !== undefined) {
                this.controller.enqueue(value);
            }
            // Check if the field is complete, if so close the stream
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPartialJsonObjectFieldState"])(args, this.fieldPath) === "complete") {
                this.controller.close();
                this.dispose();
            }
        } catch (e) {
            this.controller.error(e);
            this.dispose();
        }
    }
    dispose() {
        this.disposed = true;
    }
}
class StreamTextHandle {
    controller;
    disposed = false;
    fieldPath;
    lastValue = undefined;
    constructor(controller, fieldPath){
        this.controller = controller;
        this.fieldPath = fieldPath;
    }
    update(args) {
        if (this.disposed) return;
        try {
            const value = getField(args, this.fieldPath);
            if (value !== undefined && typeof value === "string") {
                const delta = value.substring(this.lastValue?.length || 0);
                this.lastValue = value;
                this.controller.enqueue(delta);
            }
            // Check if the field is complete, if so close the stream
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPartialJsonObjectFieldState"])(args, this.fieldPath) === "complete") {
                this.controller.close();
                this.dispose();
            }
        } catch (e) {
            this.controller.error(e);
            this.dispose();
        }
    }
    dispose() {
        this.disposed = true;
    }
}
class ForEachHandle {
    controller;
    disposed = false;
    fieldPath;
    processedIndexes = new Set();
    constructor(controller, fieldPath){
        this.controller = controller;
        this.fieldPath = fieldPath;
    }
    update(args) {
        if (this.disposed) return;
        try {
            const array = getField(args, this.fieldPath);
            if (!Array.isArray(array)) {
                return;
            }
            // Check each array element and emit completed ones that haven't been processed
            for(let i = 0; i < array.length; i++){
                if (!this.processedIndexes.has(i)) {
                    const elementPath = [
                        ...this.fieldPath,
                        i
                    ];
                    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPartialJsonObjectFieldState"])(args, elementPath) === "complete") {
                        this.controller.enqueue(array[i]);
                        this.processedIndexes.add(i);
                    }
                }
            }
            // Check if the entire array is complete
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPartialJsonObjectFieldState"])(args, this.fieldPath) === "complete") {
                this.controller.close();
                this.dispose();
            }
        } catch (e) {
            this.controller.error(e);
            this.dispose();
        }
    }
    dispose() {
        this.disposed = true;
    }
}
class ToolCallArgsReaderImpl {
    argTextDeltas;
    handles = new Set();
    args = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parsePartialJsonObject"])("");
    constructor(argTextDeltas){
        this.argTextDeltas = argTextDeltas;
        this.processStream();
    }
    async processStream() {
        try {
            let accumulatedText = "";
            const reader = this.argTextDeltas.getReader();
            while(true){
                const { value, done } = await reader.read();
                if (done) break;
                accumulatedText += value;
                const parsedArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parsePartialJsonObject"])(accumulatedText);
                if (parsedArgs !== undefined) {
                    this.args = parsedArgs;
                    // Notify all handles of the updated args
                    for (const handle of this.handles){
                        handle.update(parsedArgs);
                    }
                }
            }
        } catch (error) {
            console.error("Error processing argument stream:", error);
            // Notify handles of the error
            for (const handle of this.handles){
                handle.dispose();
            }
        }
    }
    get(...fieldPath) {
        return new Promise((resolve, reject)=>{
            const handle = new GetHandle(resolve, reject, fieldPath);
            // Check if the field is already complete in current args
            if (this.args && (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$json$2f$parse$2d$partial$2d$json$2d$object$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPartialJsonObjectFieldState"])(this.args, fieldPath) === "complete") {
                const value = getField(this.args, fieldPath);
                if (value !== undefined) {
                    resolve(value);
                    return;
                }
            }
            this.handles.add(handle);
            handle.update(this.args);
        });
    }
    streamValues(...fieldPath) {
        // Use a type assertion to convert the complex TypePath to a simple array
        const simplePath = fieldPath;
        const stream = new ReadableStream({
            start: (controller)=>{
                const handle = new StreamValuesHandle(controller, simplePath);
                this.handles.add(handle);
                // Check current args immediately
                handle.update(this.args);
            },
            cancel: ()=>{
                // Find and dispose the corresponding handle
                for (const handle of this.handles){
                    if (handle instanceof StreamValuesHandle) {
                        handle.dispose();
                        this.handles.delete(handle);
                        break;
                    }
                }
            }
        });
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$AsyncIterableStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["asAsyncIterableStream"])(stream);
    }
    streamText(...fieldPath) {
        // Use a type assertion to convert the complex TypePath to a simple array
        const simplePath = fieldPath;
        const stream = new ReadableStream({
            start: (controller)=>{
                const handle = new StreamTextHandle(controller, simplePath);
                this.handles.add(handle);
                // Check current args immediately
                handle.update(this.args);
            },
            cancel: ()=>{
                // Find and dispose the corresponding handle
                for (const handle of this.handles){
                    if (handle instanceof StreamTextHandle) {
                        handle.dispose();
                        this.handles.delete(handle);
                        break;
                    }
                }
            }
        });
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$AsyncIterableStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["asAsyncIterableStream"])(stream);
    }
    forEach(...fieldPath) {
        // Use a type assertion to convert the complex TypePath to a simple array
        const simplePath = fieldPath;
        const stream = new ReadableStream({
            start: (controller)=>{
                const handle = new ForEachHandle(controller, simplePath);
                this.handles.add(handle);
                // Check current args immediately
                handle.update(this.args);
            },
            cancel: ()=>{
                // Find and dispose the corresponding handle
                for (const handle of this.handles){
                    if (handle instanceof ForEachHandle) {
                        handle.dispose();
                        this.handles.delete(handle);
                        break;
                    }
                }
            }
        });
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$AsyncIterableStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["asAsyncIterableStream"])(stream);
    }
}
class ToolCallResponseReaderImpl {
    promise;
    constructor(promise){
        this.promise = promise;
    }
    get() {
        return this.promise;
    }
}
class ToolCallReaderImpl {
    args;
    response;
    writable;
    resolve;
    argsText = "";
    constructor(){
        const stream = new TransformStream();
        this.writable = stream.writable;
        this.args = new ToolCallArgsReaderImpl(stream.readable);
        const { promise, resolve } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$utils$2f$promiseWithResolvers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["promiseWithResolvers"])();
        this.resolve = resolve;
        this.response = new ToolCallResponseReaderImpl(promise);
    }
    async appendArgsTextDelta(text) {
        const writer = this.writable.getWriter();
        try {
            await writer.write(text);
        } catch (err) {
            console.warn(err);
        } finally{
            writer.releaseLock();
        }
        this.argsText += text;
    }
    setResponse(value) {
        this.resolve(value);
    }
    result = {
        get: async ()=>{
            const response = await this.response.get();
            return response.result;
        }
    };
} //# sourceMappingURL=ToolCallReader.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/ToolExecutionStream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ToolExecutionStream",
    ()=>ToolExecutionStream
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$secure$2d$json$2d$parse$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/secure-json-parse/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$AssistantMetaTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/AssistantMetaTransformStream.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$PipeableTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/stream/PipeableTransformStream.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/ToolResponse.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$withPromiseOrValue$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/utils/withPromiseOrValue.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolCallReader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/ToolCallReader.js [app-client] (ecmascript)");
;
;
;
;
;
;
class ToolExecutionStream extends __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$PipeableTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PipeableTransformStream"] {
    constructor(options){
        const toolCallPromises = new Map();
        const toolCallControllers = new Map();
        super((readable)=>{
            const transform = new TransformStream({
                transform (chunk, controller) {
                    // forward everything
                    if (chunk.type !== "part-finish" || chunk.meta.type !== "tool-call") {
                        controller.enqueue(chunk);
                    }
                    const type = chunk.type;
                    switch(type){
                        case "part-start":
                            if (chunk.part.type === "tool-call") {
                                const reader = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolCallReader$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolCallReaderImpl"]();
                                toolCallControllers.set(chunk.part.toolCallId, reader);
                                options.streamCall({
                                    reader,
                                    toolCallId: chunk.part.toolCallId,
                                    toolName: chunk.part.toolName
                                });
                            }
                            break;
                        case "text-delta":
                            {
                                if (chunk.meta.type === "tool-call") {
                                    const toolCallId = chunk.meta.toolCallId;
                                    const controller = toolCallControllers.get(toolCallId);
                                    if (!controller) throw new Error("No controller found for tool call");
                                    controller.appendArgsTextDelta(chunk.textDelta);
                                }
                                break;
                            }
                        case "result":
                            {
                                if (chunk.meta.type !== "tool-call") break;
                                const { toolCallId } = chunk.meta;
                                const controller = toolCallControllers.get(toolCallId);
                                if (!controller) throw new Error("No controller found for tool call");
                                controller.setResponse(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolResponse"]({
                                    result: chunk.result,
                                    artifact: chunk.artifact,
                                    isError: chunk.isError
                                }));
                                break;
                            }
                        case "tool-call-args-text-finish":
                            {
                                if (chunk.meta.type !== "tool-call") break;
                                const { toolCallId, toolName } = chunk.meta;
                                const streamController = toolCallControllers.get(toolCallId);
                                if (!streamController) throw new Error("No controller found for tool call");
                                let isExecuting = false;
                                const promise = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$withPromiseOrValue$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withPromiseOrValue"])(()=>{
                                    let args;
                                    try {
                                        args = __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$secure$2d$json$2d$parse$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].parse(streamController.argsText);
                                    } catch (e) {
                                        throw new Error(`Function parameter parsing failed. ${JSON.stringify(e.message)}`);
                                    }
                                    const executeResult = options.execute({
                                        toolCallId,
                                        toolName,
                                        args
                                    });
                                    // Only mark as executing if the tool has frontend execution
                                    if (executeResult !== undefined) {
                                        isExecuting = true;
                                        options.onExecutionStart?.(toolCallId, toolName);
                                    }
                                    return executeResult;
                                }, (c)=>{
                                    if (isExecuting) {
                                        options.onExecutionEnd?.(toolCallId, toolName);
                                    }
                                    if (c === undefined) return;
                                    // TODO how to handle new ToolResult({ result: undefined })?
                                    const result = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolResponse"]({
                                        artifact: c.artifact,
                                        result: c.result,
                                        isError: c.isError
                                    });
                                    streamController.setResponse(result);
                                    controller.enqueue({
                                        type: "result",
                                        path: chunk.path,
                                        ...result
                                    });
                                }, (e)=>{
                                    if (isExecuting) {
                                        options.onExecutionEnd?.(toolCallId, toolName);
                                    }
                                    const result = new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolResponse"]({
                                        result: String(e),
                                        isError: true
                                    });
                                    streamController.setResponse(result);
                                    controller.enqueue({
                                        type: "result",
                                        path: chunk.path,
                                        ...result
                                    });
                                });
                                if (promise) {
                                    toolCallPromises.set(toolCallId, promise);
                                }
                                break;
                            }
                        case "part-finish":
                            {
                                if (chunk.meta.type !== "tool-call") break;
                                const { toolCallId } = chunk.meta;
                                const toolCallPromise = toolCallPromises.get(toolCallId);
                                if (toolCallPromise) {
                                    toolCallPromise.then(()=>{
                                        toolCallPromises.delete(toolCallId);
                                        toolCallControllers.delete(toolCallId);
                                        controller.enqueue(chunk);
                                    });
                                } else {
                                    controller.enqueue(chunk);
                                }
                            }
                    }
                },
                async flush () {
                    await Promise.all(toolCallPromises.values());
                }
            });
            return readable.pipeThrough(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$utils$2f$stream$2f$AssistantMetaTransformStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AssistantMetaTransformStream"]()).pipeThrough(transform);
        });
    }
} //# sourceMappingURL=ToolExecutionStream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/toolResultStream.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "toolResultStream",
    ()=>toolResultStream,
    "unstable_runPendingTools",
    ()=>unstable_runPendingTools
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/ToolResponse.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolExecutionStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/ToolExecutionStream.js [app-client] (ecmascript)");
;
;
const isStandardSchemaV1 = (schema)=>{
    return typeof schema === "object" && schema !== null && "~standard" in schema && schema["~standard"].version === 1;
};
function getToolResponse(tools, abortSignal, toolCall, human) {
    const tool = tools?.[toolCall.toolName];
    if (!tool || !tool.execute) return undefined;
    const getResult = async (toolExecute)=>{
        // Check if already aborted before starting
        if (abortSignal.aborted) {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolResponse"]({
                result: "Tool execution was cancelled.",
                isError: true
            });
        }
        let executeFn = toolExecute;
        if (isStandardSchemaV1(tool.parameters)) {
            let result = tool.parameters["~standard"].validate(toolCall.args);
            if (result instanceof Promise) result = await result;
            if (result.issues) {
                executeFn = tool.experimental_onSchemaValidationError ?? (()=>{
                    throw new Error(`Function parameter validation failed. ${JSON.stringify(result.issues)}`);
                });
            }
        }
        // Create abort promise that resolves after 2 microtasks
        // This gives tools that handle abort a chance to win the race
        const abortPromise = new Promise((resolve)=>{
            const onAbort = ()=>{
                queueMicrotask(()=>{
                    queueMicrotask(()=>{
                        resolve(new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolResponse"]({
                            result: "Tool execution was cancelled.",
                            isError: true
                        }));
                    });
                });
            };
            if (abortSignal.aborted) {
                onAbort();
            } else {
                abortSignal.addEventListener("abort", onAbort, {
                    once: true
                });
            }
        });
        const executePromise = (async ()=>{
            const result = await executeFn(toolCall.args, {
                toolCallId: toolCall.toolCallId,
                abortSignal,
                human: (payload)=>human(toolCall.toolCallId, payload)
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolResponse$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolResponse"].toResponse(result);
        })();
        return Promise.race([
            executePromise,
            abortPromise
        ]);
    };
    return getResult(tool.execute);
}
function getToolStreamResponse(tools, abortSignal, reader, context, human) {
    tools?.[context.toolName]?.streamCall?.(reader, {
        toolCallId: context.toolCallId,
        abortSignal,
        human: (payload)=>human(context.toolCallId, payload)
    });
}
async function unstable_runPendingTools(message, tools, abortSignal, human) {
    const toolCallPromises = message.parts.filter((part)=>part.type === "tool-call").map(async (part)=>{
        const promiseOrUndefined = getToolResponse(tools, abortSignal, part, human ?? (async ()=>{
            throw new Error("Tool human input is not supported in this context");
        }));
        if (promiseOrUndefined) {
            const result = await promiseOrUndefined;
            return {
                toolCallId: part.toolCallId,
                result
            };
        }
        return null;
    });
    const toolCallResults = (await Promise.all(toolCallPromises)).filter((result)=>result !== null);
    if (toolCallResults.length === 0) {
        return message;
    }
    const toolCallResultsById = toolCallResults.reduce((acc, { toolCallId, result })=>{
        acc[toolCallId] = result;
        return acc;
    }, {});
    const updatedParts = message.parts.map((p)=>{
        if (p.type === "tool-call") {
            const toolResponse = toolCallResultsById[p.toolCallId];
            if (toolResponse) {
                return {
                    ...p,
                    state: "result",
                    ...toolResponse.artifact !== undefined ? {
                        artifact: toolResponse.artifact
                    } : {},
                    result: toolResponse.result,
                    isError: toolResponse.isError
                };
            }
        }
        return p;
    });
    return {
        ...message,
        parts: updatedParts,
        content: updatedParts
    };
}
function toolResultStream(tools, abortSignal, human, options) {
    const toolsFn = typeof tools === "function" ? tools : ()=>tools;
    const abortSignalFn = typeof abortSignal === "function" ? abortSignal : ()=>abortSignal;
    return new __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$ToolExecutionStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToolExecutionStream"]({
        execute: (toolCall)=>getToolResponse(toolsFn(), abortSignalFn(), toolCall, human),
        streamCall: ({ reader, ...context })=>getToolStreamResponse(toolsFn(), abortSignalFn(), reader, context, human),
        onExecutionStart: options?.onExecutionStart,
        onExecutionEnd: options?.onExecutionEnd
    });
} //# sourceMappingURL=toolResultStream.js.map
}),
"[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/toolResultStream.js [app-client] (ecmascript) <export toolResultStream as unstable_toolResultStream>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "unstable_toolResultStream",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$toolResultStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toolResultStream"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$assistant$2d$stream$2f$dist$2f$core$2f$tool$2f$toolResultStream$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/assistant-stream/dist/core/tool/toolResultStream.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=1198e_assistant-stream_dist_63f29337._.js.map