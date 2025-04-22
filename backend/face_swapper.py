from facefusion import face_swapper, face_analyser
import cv2

def swap_faces_in_video(source_image_path, target_video_path, output_video_path):
    source_image = cv2.imread(source_image_path)
    if source_image is None:
        raise FileNotFoundError("Source image not found.")

    cap = cv2.VideoCapture(target_video_path)
    if not cap.isOpened():
        raise FileNotFoundError("Target video not found.")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    # analyse source face once
    source_faces = face_analyser.detect_faces(source_image)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # analyse faces in target frame
        target_faces = face_analyser.detect_faces(frame)

        # swap!
        swapped_frame = face_swapper.swap(source_image, frame, source_faces, target_faces)

        out.write(swapped_frame)

    cap.release()
    out.release()
