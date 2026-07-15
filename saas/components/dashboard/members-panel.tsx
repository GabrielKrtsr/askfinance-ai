"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Loader2, ShieldCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { approveMember, changeMemberRole, removeMember } from "@/lib/actions/workspaces";
import type { MembersView } from "@/lib/data/workspace";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

// Même hiérarchie que côté serveur : on n'agit que sur un rang strictement inférieur.
const ROLE_RANK: Record<string, number> = { owner: 3, admin: 2, member: 1, viewer: 0 };
const rank = (role: string | null) => (role ? ROLE_RANK[role] ?? 0 : 0);

export function MembersPanel({
  view,
  workspaceId,
}: {
  view: MembersView;
  workspaceId: string;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = dashboardCopy[locale].members;
  const roleLabels: Record<string, string> = { owner: copy.owner, admin: copy.admin, member: copy.member, viewer: copy.viewer };
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const canManage = view.callerRole === "owner" || view.callerRole === "admin";
  const activeCount = view.members.filter((m) => m.status === "active").length;

  useEffect(() => {
    if (!view.joinCode) return;
    setInviteLink(
      `${window.location.origin}/onboarding?invite=${encodeURIComponent(
        view.joinCode
      )}`
    );
  }, [view.joinCode]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.actionFailed);
    } finally {
      setBusy(null);
    }
  }

  function copyCode() {
    if (!view.joinCode) return;
    navigator.clipboard.writeText(view.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function copyInviteLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  }

  return (
    <div className="space-y-6">
      {view.joinCode && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold">{copy.invite}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.inviteDesc}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
              {inviteLink || view.joinCode}
            </code>
            <Button variant="outline" size="sm" onClick={copyInviteLink}>
              {copiedLink ? (
                <Check className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {copiedLink ? copy.linkCopiedShort : copy.copyLink}
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{copy.code}</span>
            <code className="rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs tracking-widest">
              {view.joinCode}
            </code>
            <Button variant="ghost" size="sm" onClick={copyCode}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? copy.copied : copy.copy}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-semibold">{copy.members} ({activeCount})</h2>
        <ul className="mt-3 divide-y">
          {view.members.map((m) => {
            const isSelf = m.userId === view.currentUserId;
            const pending = m.status === "pending";
            return (
              <li key={m.userId} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal text-xs font-semibold text-white">
                  {(m.name[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name}
                    {isSelf && <span className="text-muted-foreground"> {copy.you}</span>}
                  </p>
                  <p
                    className={
                      pending
                        ? "text-xs font-medium text-amber-600"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {pending
                      ? copy.pending
                      : roleLabels[m.role] ?? m.role}
                  </p>
                </div>

                {canManage && pending && (
                  <div className="flex gap-1"><Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      run(m.userId, () =>
                        approveMember({ workspaceId, userId: m.userId })
                      )
                    }
                  >
                    {busy === m.userId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {copy.approve}
                  </Button><Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => run(`rm-${m.userId}`, () => removeMember({ workspaceId, userId: m.userId }))}>{copy.reject}</Button></div>
                )}

                {canManage && !pending && !isSelf && rank(m.role) < rank(view.callerRole) && (
                  <>
                  <select
                    value={m.role}
                    disabled={busy !== null}
                    onChange={(event) => run(`role-${m.userId}`, () => changeMemberRole({ workspaceId, userId: m.userId, role: event.target.value as "admin" | "member" | "viewer" }))}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    {view.callerRole === "owner" && <option value="admin">{copy.admin}</option>}
                    <option value="member">{copy.member}</option>
                    <option value="viewer">{copy.viewer}</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-500"
                    disabled={busy !== null}
                    onClick={() =>
                      run(`rm-${m.userId}`, () =>
                        removeMember({ workspaceId, userId: m.userId })
                      )
                    }
                    aria-label={copy.remove}
                  >
                    {busy === `rm-${m.userId}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
