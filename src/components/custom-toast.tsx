import { ToastContainer, Zoom } from "react-toastify"

import "react-toastify/ReactToastify.css"

function CustomToast() {
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      transition={Zoom}
    />
  )
}

export default CustomToast
