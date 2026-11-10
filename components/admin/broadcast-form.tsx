"use client";

import { type ReactNode, useState, useTransition } from "react";
import type { z } from "zod";

import { FormSection } from "@/components/blocks/forms/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readApiEnvelope } from "@/lib/api-envelope";
import { publicEnv } from "@/lib/public-env";
import { emailBroadcastSchema } from "@/lib/schemas/admin";
import type { sendEmailBroadcast } from "@/lib/services/email-broadcasts";
import { splitParagraphs } from "@/lib/utils";

type Audience = z.infer<typeof emailBroadcastSchema>["audience"];
type BroadcastSummary = Awaited<ReturnType<typeof sendEmailBroadcast>>;

const SITE_NAME = publicEnv.NEXT_PUBLIC_SITE_NAME;

export function BroadcastForm({ counts }: { counts: { all: number; active: number } }) {
  const [pending, startTransition] = useTransition();
  const [audience, setAudience] = useState<Audience>("ALL");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BroadcastSummary | null>(null);

  const recipientCount = audience === "ALL" ? counts.all : audience === "ACTIVE" ? counts.active : 1;
  const paragraphs = splitParagraphs(text);

  const submit = () => {
    // The API answers any invalid body with a generic message, so show the schema's own wording here.
    const parsed = emailBroadcastSchema.safeParse({ audience, email, subject, text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте поля формы");
      return;
    }
    if (audience !== "ONE" && !window.confirm(`Отправить письмо ${recipientCount} получателям?`)) {
      return;
    }

    startTransition(async () => {
      setError(null);
      setSummary(null);
      const response = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parsed.data)
      });

      const payload = await readApiEnvelope<BroadcastSummary>(response);
      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "Не удалось отправить рассылку");
        return;
      }

      setSummary(payload.data);
    });
  };

  return (
    <div className="controlForm">
      <FormSection title="Кому" description="Служебные письма: работы на серверах, изменения правил, новые локации.">
        <div className="controlFormBody">
          <AudienceOption value="ALL" current={audience} onSelect={setAudience}>
            Всем пользователям — {counts.all}
          </AudienceOption>
          <AudienceOption value="ACTIVE" current={audience} onSelect={setAudience}>
            С активной подпиской — {counts.active}
          </AudienceOption>
          <AudienceOption value="ONE" current={audience} onSelect={setAudience}>
            Одному адресу
          </AudienceOption>
          {audience === "ONE" ? (
            <div className="controlField">
              <Label htmlFor="broadcast-email">Адрес</Label>
              <Input
                id="broadcast-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <p className="controlFieldHint">Удобно, чтобы сначала отправить письмо себе и проверить его.</p>
            </div>
          ) : null}
        </div>
      </FormSection>

      <FormSection title="Письмо" description="Обычный текст. Пустая строка начинает новый абзац.">
        <div className="controlFormBody">
          <div className="controlField">
            <Label htmlFor="broadcast-subject">Тема</Label>
            <Input
              id="broadcast-subject"
              maxLength={200}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="controlField">
            <Label htmlFor="broadcast-text">Текст</Label>
            <Textarea
              id="broadcast-text"
              rows={10}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Предпросмотр" description="Так письмо увидит получатель.">
        <div className="broadcastPreview">
          <p className="broadcastPreviewSubject">Тема: {subject || "—"}</p>
          <div className="broadcastPreviewHeader">{SITE_NAME}</div>
          <div className="broadcastPreviewBody">
            {paragraphs.length > 0
              ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
              : <p className="broadcastPreviewPlaceholder">Текст письма</p>}
          </div>
          <div className="broadcastPreviewFooter">
            Вы получили это письмо, потому что зарегистрированы на {SITE_NAME}.
          </div>
        </div>
      </FormSection>

      <FormSection title="Отправка">
        <div className="controlFormBody">
          {error ? <p className="controlMessage controlMessageError">{error}</p> : null}
          {summary ? (
            <p className="controlMessage">
              Отправлено {summary.sent} из {summary.total}, ошибок: {summary.failed}.
              {summary.failed > 0 ? ` Не ушло: ${summary.failedEmails.join(", ")}` : null}
            </p>
          ) : null}
          <div className="controlFormActions">
            <Button
              type="button"
              className="commandButton commandButtonPrimary"
              onClick={submit}
              disabled={pending}
            >
              {pending
                ? "Отправляем..."
                : audience === "ONE"
                  ? "Отправить на адрес"
                  : `Отправить ${recipientCount} получателям`}
            </Button>
          </div>
        </div>
      </FormSection>
    </div>
  );
}

function AudienceOption({
  value,
  current,
  onSelect,
  children
}: {
  value: Audience;
  current: Audience;
  onSelect: (value: Audience) => void;
  children: ReactNode;
}) {
  return (
    <label className="controlCheckboxRow">
      <input
        type="radio"
        name="broadcast-audience"
        checked={current === value}
        onChange={() => onSelect(value)}
      />
      {children}
    </label>
  );
}
