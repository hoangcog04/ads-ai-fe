export function TextField({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  type?: string
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-600">
      {label}
      <input
        className="h-9 w-full min-w-0 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
        disabled={disabled}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function TextareaField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-600">
      {label}
      <textarea
        className="min-h-20 w-full min-w-0 rounded-md border border-zinc-300 p-2 text-sm leading-5 text-zinc-900"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
