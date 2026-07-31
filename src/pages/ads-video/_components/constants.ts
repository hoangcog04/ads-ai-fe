export const PRODUCT_KIND_OPTIONS = [
  "app_screen",
  "physical_product",
  "packaging",
  "logo",
  "usage_photo",
  "before_after",
  "other",
]
export const VOICE_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
]
export const DURATION_RANGE_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "15-20", label: "15-20s" },
  { value: "20-30", label: "20-30s" },
  { value: "30-40", label: "30-40s" },
  { value: "40-60", label: "40-60s" },
]
export const SCENE_DURATION_OPTIONS = [4, 6, 8, 10] as const
