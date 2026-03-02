# Phase 3: Face Recognition Service — Test Results

Run the face-service first:
```bash
cd face-service
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 1. Health check

```bash
curl -s http://localhost:8000/health
```

**Expected:** `200 OK`, body includes `"status": "ok"`, `"model": "ArcFace"`.

**Result:**

| Status | Response |
|--------|----------|
| ok | {"success":true,"data":{"status":"ok","model":"ArcFace","service":"toms-face-service","timestamp":"2026-02-22T09:39:15.370396Z"}} |

---

## 2. Enrollment test (Ian Thorpe, 5 images)

From project root (paths relative to repo root):

**PowerShell (Windows):**
```powershell
$base = "c:\Users\Administrator1\Desktop\Full Stack\tom-system"
$images = @(
  "$base\test-data\faces\Ian_Thorpe\Ian_Thorpe_0001.jpg",
  "$base\test-data\faces\Ian_Thorpe\Ian_Thorpe_0002.jpg",
  "$base\test-data\faces\Ian_Thorpe\Ian_Thorpe_0003.jpg",
  "$base\test-data\faces\Ian_Thorpe\Ian_Thorpe_0004.jpg",
  "$base\test-data\faces\Ian_Thorpe\Ian_Thorpe_0005.jpg"
)
curl.exe -X POST http://localhost:8000/enroll -F "driver_id=TEST_IAN_THORPE" -F "images=@$($images[0])" -F "images=@$($images[1])" -F "images=@$($images[2])" -F "images=@$($images[3])" -F "images=@$($images[4])" -o enrollment_result_ian.json
```

**Bash (macOS/Linux):**
```bash
curl -X POST http://localhost:8000/enroll \
  -F "driver_id=TEST_IAN_THORPE" \
  -F "images=@test-data/faces/Ian_Thorpe/Ian_Thorpe_0001.jpg" \
  -F "images=@test-data/faces/Ian_Thorpe/Ian_Thorpe_0002.jpg" \
  -F "images=@test-data/faces/Ian_Thorpe/Ian_Thorpe_0003.jpg" \
  -F "images=@test-data/faces/Ian_Thorpe/Ian_Thorpe_0004.jpg" \
  -F "images=@test-data/faces/Ian_Thorpe/Ian_Thorpe_0005.jpg" \
  -o enrollment_result_ian.json
```

**Expected:** JSON with `success: true`, `embedding` array of **512 floats** (ArcFace), `num_images: 5`.

**Result:**

| Check | Result |
|-------|--------|
| HTTP status |  200 |
| embedding length |  512 |
| First 10 embedding values (sample) | [0.029612297751009466,0.11610866039991379,-0.03456053286790848,-0.09811703264713287,-0.011780905723571777,-0.11138860769569874,0.23451071828603745,0.44067407250404356,-0.02399226650595665,0.09424671083688736] |

Save the returned embedding for the identify step (use the `embedding` array and wrap as `[{"driver_id": "TEST_IAN_THORPE", "embedding": [...]}]`).

---

## 3. Identification — positive match (different image of same person)

Use a **different** image of Ian Thorpe (e.g. `Ian_Thorpe_0006.jpg`) and the stored embedding from step 2.

**Example (replace `STORED_JSON` with the JSON array string):**
```bash
# Build stored_embeddings JSON: [{"driver_id":"TEST_IAN_THORPE","embedding":[...]}]
curl -X POST http://localhost:8000/identify \
  -F "image=@test-data/faces/Ian_Thorpe/Ian_Thorpe_0006.jpg" \
  -F "stored_embeddings=[{\"driver_id\":\"TEST_IAN_THORPE\",\"embedding\":<PASTE_EMBEDDING_FROM_STEP_2>}]"
```

**Expected:** `matched: true`, `confidence` > 70%, `driver_id: "TEST_IAN_THORPE"`.

**Result:**

| Check | Result |
|-------|--------|
| matched | true |
| confidence % | 82.05 |
| distance | 0.179471 |

---

## 4. Identification — negative match (different person)

Use an image of another person (e.g. Serena_Williams or Gwyneth_Paltrow) with Ian Thorpe’s stored embedding.

**Expected:** HTTP 404 or body with `matched: false` (or `confidence` < 50% if 200).

**Result:**

| Check | Result |
|-------|--------|
| matched | false |
| confidence (if any) | No match found above confidence threshold |

---

## 5. Error handling

| Test | Expected behavior | Result |
|------|-------------------|--------|
| No face (landscape photo) | 400, message like "No face detected" | Returned correct error message |
| Multiple faces (group photo) | 400, message like "Multiple faces" | Returned correct error message |
| Non-image file (e.g. .txt) | 400, invalid image format | Returned correct error message |
| Enrollment with &lt; 3 images | 400, "At least 3 images required" | Returned correct error message |

---

## 6. Threshold tuning

- **Default threshold:** `FACE_CONFIDENCE_THRESHOLD=0.4` in `.env`.
- If the **same person** fails to match (e.g. different lighting/angle): try **0.45**.
- If **different people** match incorrectly: try **0.35**.
- Document final value and reasoning below.

**Final threshold:** 0.4

**Reasoning:** 0.4 gave good separation; positive match ~80%, negative &lt; 40%.

---

## Verification checklist

- [x] Service runs on http://localhost:8000
- [x] GET /health returns 200 with `model: ArcFace`
- [x] POST /enroll accepts 3–5 images and returns 512-dim embedding
- [x] POST /identify matches enrolled face with high confidence
- [x] POST /identify rejects unenrolled/different face (low confidence or no match)
- [x] Clear error messages for no face, multiple faces, invalid file, validation errors
