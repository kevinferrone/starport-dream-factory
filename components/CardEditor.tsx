"use client";

import { useState } from "react";
import type { Kind } from "@/lib/options";
import type { AnyCard, CreatureCard, EquipmentCard, PetCard } from "@/lib/generate";
import { LIMITS } from "@/lib/card-edit";

type Props = {
  kind: Kind;
  card: AnyCard;
  /** Every keystroke, so the card above updates as you type. */
  onChange: (card: AnyCard) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
};

/** Change any words or numbers on the card. The picture stays the same. */
export default function CardEditor({ kind, card, onChange, onSave, onCancel, busy }: Props) {
  const [draft, setDraft] = useState<AnyCard>(card);
  const set = (patch: Record<string, unknown>) => {
    const next = { ...draft, ...patch } as AnyCard;
    setDraft(next);
    onChange(next);
  };

  const Text = ({ label, value, max, rows = 1, onText }: { label: string; value: string; max: number; rows?: number; onText: (v: string) => void }) => (
    <label className="edit-field">
      <span>{label}</span>
      {rows > 1 ? (
        <textarea value={value} maxLength={max} rows={rows} onChange={(e) => onText(e.target.value)} />
      ) : (
        <input type="text" value={value} maxLength={max} onChange={(e) => onText(e.target.value)} />
      )}
    </label>
  );
  const Num = ({ label, value, min, max, onNum }: { label: string; value: number; min: number; max: number; onNum: (v: number) => void }) => (
    <label className="edit-field small">
      <span>{label}</span>
      <input type="number" value={value} min={min} max={max} onChange={(e) => onNum(Number(e.target.value))} />
    </label>
  );

  return (
    <form
      className="card-editor panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <h2>
        <span className="emoji" aria-hidden>✏️</span> Edit my card
      </h2>
      <p className="hint">Change any words or numbers. The picture stays the same.</p>

      {Text({ label: "Name", value: draft.name, max: LIMITS.name, onText: (v) => set({ name: v }) })}
      {Text({ label: "Description", value: draft.description, max: LIMITS.description, rows: 3, onText: (v) => set({ description: v }) })}

      {kind === "creature" &&
        (() => {
          const c = draft as CreatureCard;
          return (
            <>
              <div className="edit-row">
                {Num({ label: "Difficulty", value: c.difficulty, min: 1, max: 30, onNum: (v) => set({ difficulty: v }) })}
                {Num({ label: "Successes to defeat", value: c.successes, min: 1, max: 7, onNum: (v) => set({ successes: v }) })}
              </div>
              {c.abilities.map((a, i) => (
                <fieldset key={i} className="edit-group">
                  <legend>Ability {i + 1}</legend>
                  {Text({
                    label: "Name",
                    value: a.name,
                    max: LIMITS.ruleName,
                    onText: (v) => set({ abilities: c.abilities.map((x, j) => (j === i ? { ...x, name: v } : x)) }),
                  })}
                  {Text({
                    label: "What it does",
                    value: a.effect,
                    max: LIMITS.rule,
                    rows: 3,
                    onText: (v) => set({ abilities: c.abilities.map((x, j) => (j === i ? { ...x, effect: v } : x)) }),
                  })}
                </fieldset>
              ))}
              <fieldset className="edit-group">
                <legend>Special</legend>
                {Text({ label: "Name", value: c.special.name, max: LIMITS.ruleName, onText: (v) => set({ special: { ...c.special, name: v } }) })}
                {Text({ label: "What it does", value: c.special.effect, max: LIMITS.rule, rows: 3, onText: (v) => set({ special: { ...c.special, effect: v } }) })}
              </fieldset>
            </>
          );
        })()}

      {kind === "equipment" &&
        (() => {
          const e = draft as EquipmentCard;
          return (
            <>
              <div className="edit-row">
                {Num({ label: "Cost in Coins", value: e.cost, min: 1, max: 50, onNum: (v) => set({ cost: v }) })}
                <label className="edit-field small">
                  <span>Type</span>
                  <select value={e.type} onChange={(ev) => set({ type: ev.target.value })}>
                    <option value="permanent">Keep forever</option>
                    <option value="consumable">One-time use</option>
                  </select>
                </label>
                <label className="edit-field small">
                  <span>Using it</span>
                  <select value={e.uses_turn ? "yes" : "no"} onChange={(ev) => set({ uses_turn: ev.target.value === "yes" })}>
                    <option value="no">Doesn&apos;t take a turn</option>
                    <option value="yes">Takes your turn</option>
                  </select>
                </label>
              </div>
              {Text({ label: "What it does", value: e.effect, max: LIMITS.rule, rows: 4, onText: (v) => set({ effect: v }) })}
            </>
          );
        })()}

      {kind === "pet" &&
        (() => {
          const p = draft as PetCard;
          return (
            <>
              {Num({ label: "Cost in Coins", value: p.cost, min: 1, max: 50, onNum: (v) => set({ cost: v }) })}
              {Text({ label: "Bonus", value: p.bonuses, max: LIMITS.bonuses, rows: 2, onText: (v) => set({ bonuses: v }) })}
              <fieldset className="edit-group">
                <legend>Power</legend>
                {Text({ label: "Name", value: p.power.name, max: LIMITS.ruleName, onText: (v) => set({ power: { ...p.power, name: v } }) })}
                {Text({ label: "What it does", value: p.power.effect, max: LIMITS.rule, rows: 3, onText: (v) => set({ power: { ...p.power, effect: v } }) })}
              </fieldset>
            </>
          );
        })()}

      <div className="actions">
        <button className="big-btn small mint" type="submit" disabled={busy}>
          <span className="emoji" aria-hidden>💾</span> {busy ? "Saving…" : "Save changes"}
        </button>
        <button className="big-btn small plain" type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
