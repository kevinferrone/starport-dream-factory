"use client";

import type { Kind } from "@/lib/options";
import type { AnyCard, CreatureCard, EquipmentCard, PetCard } from "@/lib/generate";
import { LIMITS } from "@/lib/card-edit";
import { DEFAULT_ART, ZOOM_MAX } from "@/lib/art-fit";

type Props = {
  kind: Kind;
  card: AnyCard;
  /** Every keystroke, so the card above updates as you type. */
  onChange: (card: AnyCard) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  /** Only cards with a picture get the picture controls. */
  hasPicture: boolean;
};

/** Change any words or numbers on the card. The picture stays the same. */
export default function CardEditor({ kind, card, onChange, onSave, onCancel, busy, hasPicture }: Props) {
  // The card above is the draft, so dragging the picture there and typing here stay in step.
  const draft = card;
  const set = (patch: Record<string, unknown>) => onChange({ ...draft, ...patch } as AnyCard);
  const art = draft.art ?? DEFAULT_ART;

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
      <p className="hint">Change any words or numbers, and choose how the picture fits.</p>

      {hasPicture && (
        <fieldset className="edit-group">
          <legend>Picture</legend>
          <div className="pic-fit" role="group" aria-label="How the picture fits">
            <button type="button" aria-pressed={art.fit === "whole"} onClick={() => set({ art: { ...art, fit: "whole" } })}>
              Show the whole picture
            </button>
            <button type="button" aria-pressed={art.fit === "fill"} onClick={() => set({ art: { ...art, fit: "fill" } })}>
              Fill the frame
            </button>
          </div>
          {art.fit === "fill" && (
            <>
              <label className="zoom">
                <span>Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={ZOOM_MAX}
                  step={0.05}
                  value={art.zoom}
                  onChange={(e) => set({ art: { ...art, zoom: Number(e.target.value) } })}
                />
              </label>
              <p className="hint">Drag the picture on the card to choose which part shows.</p>
            </>
          )}
        </fieldset>
      )}

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
