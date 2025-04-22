const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureButton = document.getElementById("capture");
const submitButton = document.getElementById("submit");
const resultDiv = document.getElementById("result");

let imageBlob = null;

// Start webcam
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  video.srcObject = stream;
});

captureButton.onclick = () => {
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    imageBlob = blob;
    submitButton.disabled = false;
  }, "image/jpeg");
};

submitButton.onclick = () => {
  if (!imageBlob) return;

  const formData = new FormData();
  formData.append("image", imageBlob, "face.jpg");

  fetch("http://localhost:5000/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      const videoUrl = data.video_url;
      resultDiv.innerHTML = `
        <h2>Result:</h2>
        <video controls width="300">
          <source src="http://localhost:5000/${videoUrl}" type="video/mp4">
        </video>
      `;
    });
};
