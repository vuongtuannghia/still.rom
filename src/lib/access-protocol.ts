import { isRecord, isUuid } from "./focus-domain";

export const ACCESS_FIELD = "__stillroomAccess";
export const ACCESS_VERSION = 1;
export type WorkspaceProof = { version: 1; token: string; workspaceId: string };
export type WorkspaceGrant = {
  workspaceId: string; scope: "personal"; canRead: true; canWrite: true;
  transport: "json-body"; protocolVersion: 1;
};
export type AuthenticatedEnvelope = {
  __stillroomAccess: WorkspaceProof;
  payload: Record<string, unknown>;
};
export function validAccessToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
export function validWorkspaceProof(value: unknown): value is WorkspaceProof {
  return isRecord(value) && value.version === ACCESS_VERSION && validAccessToken(value.token) && isUuid(value.workspaceId);
}
export function validWorkspaceGrant(value: unknown): value is WorkspaceGrant {
  return isRecord(value) && isUuid(value.workspaceId) && value.scope === "personal" && value.canRead === true && value.canWrite === true && value.transport === "json-body" && value.protocolVersion === ACCESS_VERSION;
}
export function authenticatedEnvelope(token: string, workspaceId: string, payload: Record<string, unknown> = {}): AuthenticatedEnvelope {
  return { __stillroomAccess: { version: ACCESS_VERSION, token, workspaceId }, payload };
}
export function workspaceGrant(workspaceId: string): WorkspaceGrant {
  return { workspaceId, scope: "personal", canRead: true, canWrite: true, transport: "json-body", protocolVersion: ACCESS_VERSION };
}
