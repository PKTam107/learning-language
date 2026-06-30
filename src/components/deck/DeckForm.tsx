"use client";

import { useState } from "react";
import type { Deck } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { createDeck, updateDeck } from "@/lib/db/decks";

interface DeckFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Có deck = chế độ sửa. */
  deck?: Deck | null;
}

export function DeckForm({ open, onClose, onSaved, deck }: DeckFormProps) {
  const [name, setName] = useState(deck?.name ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (deck) {
        await updateDeck(deck.id, { name, description });
      } else {
        await createDeck({ name, description });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={deck ? "Sửa bộ thẻ" : "Tạo bộ thẻ mới"}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Tên bộ thẻ (vd: TOEIC 900)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <Textarea
          rows={2}
          placeholder="Mô tả (tùy chọn)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving && <Spinner />}
            {deck ? "Lưu" : "Tạo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
