# Ads AI Frontend

React/Vite UI cho Tool Project tao ads video.

## Current workflow

1. Tao Tool Project, nhap Plan Inputs, upload Product Reference Set.
2. Generate/import Ads Plan.
3. Co the quay lai `Plan`, sua input, `Save edits` hoac `Save & Replan`; replan giu cung Tool Project/Flow Project nhung replace downstream plan data.
4. Tai `References`, generate hoac upload Character/Location; co the generate lai de co version moi.
5. Upload complete Flow Reference Set. Nut `Next: Keyframes` chi enable khi Product + Character + Location current versions da map vao Flow.
6. Generate candidates cho tung Keyframe Prompt Slot, sua/save slot neu can, chon mot candidate/slot.
7. Sua/save direct-write Video Prompt, generate Scene Video khi moi slot da co selection.
8. Khi moi scene co local Scene Video, merge bang FFmpeg; preview/download Final Ad Video.

UI poll project/task state, nhung candidate/media lists duoc render theo stable order de tranh nhay layout. Form dirty state la local; stale flags la persisted downstream warning.

## Destructive boundaries

- Project Replan: replace character/location specs, scenes, slots/candidates va downstream domain rows; product refs va Flow Project identity duoc giu.
- Scene Replan: replace scene plan, slots/candidates va Video Prompt cua scene.
- Generate lai Character/Location: tao current image version moi; complete Flow reference upload phai map version moi truoc keyframes.
- Generate lai Scene Video: clear Final Ad Video; merge lai sau.

## Main API-bound actions

- Update Plan Inputs: `PATCH /ads/projects/:projectId`.
- Generate/import plan: `POST /ads/projects/:projectId/plan`, `POST /ads/projects/:projectId/plan/import`.
- Upload Character/Location image: `POST /ads/assets/:assetId/reference-image`.
- Generate Character/Location: `POST /ads/assets/:assetId/generate`.
- Upload complete reference set to Flow: `POST /ads/projects/:projectId/product-references/upload`.
- Scene replan: `POST /ads/scenes/:sceneId/replan`.
- Direct scene save: `PATCH /ads/scenes/:sceneId`.
- Direct Video Prompt save: `PATCH /ads/scenes/:sceneId/video-prompt`.
- Keyframe slot save/generate/select: `PATCH /ads/keyframe-slots/:slotId`, `POST /ads/keyframe-slots/:slotId/generate`, `POST /ads/keyframe-slots/:slotId/select`.
- Scene Video: `POST /ads/scenes/:sceneId/video`.
- Final merge: `POST /ads/projects/:projectId/final-video/assemble`.

## Commands

```bash
npm run dev
npm run build
npm run lint
```
