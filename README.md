# Ads AI Frontend

React/Vite UI for Ads Video Tool Projects.

## Main workflow

1. Create project and Product Reference Set.
2. Run/import plan, then generate Character and Location.
3. Explicitly upload product refs to Google Flow.
4. Generate/select candidates for every Keyframe Prompt Slot.
5. Generate each Scene Video.
6. Merge all completed scene videos, preview, or download Final Ad Video.

## API-bound actions

- Product Flow upload: `POST /ads/projects/:projectId/flow/product-refs/upload`.
- Keyframe slot generation/selection: `/ads/keyframe-slots/:slotId/generate` and `/ads/keyframe-slots/:slotId/select`.
- Scene video: `POST /ads/scenes/:sceneId/video`.
- Final merge: `POST /ads/projects/:projectId/final-video/assemble`.

`FinalVideoPanel` only permits merge when every scene has a completed Scene Video and no scene video task is running. Regenerating a scene video clears previously merged output.

## Commands

```bash
npm run dev
npm run build
npm run lint
```
