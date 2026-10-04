export type WorkspaceGrant = { workspaceId: string; scope: "personal" | "shared"; canRead: boolean; canWrite: boolean; transport: "json-body"; protocolVersion: 1 };
const HEX=/^[0-9a-f]+$/i;
export function validAccessToken(value: unknown): value is string { return typeof value === "string" && value.length >= 32 && value.length <= 128 && HEX.test(value); }
export function validWorkspaceGrant(value: unknown): value is WorkspaceGrant { return !!value && typeof value === "object" && "workspaceId" in value && typeof (value as {workspaceId?:unknown}).workspaceId === "string"; }
export function authenticatedEnvelope(token: string, workspaceId: string) { return { accessProof: { token, workspaceId, protocolVersion: 1 }, payload: {} }; }
