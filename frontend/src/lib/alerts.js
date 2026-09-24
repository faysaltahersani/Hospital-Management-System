import Swal from "sweetalert2";

/**
 * Custom styled SweetAlert2 confirmation dialog for Delete action
 */
export async function confirmDelete(title = "Are you sure?", text = "This record will be permanently deleted.") {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    customClass: {
      popup: "rounded-lg shadow-xl border border-gray-200",
      confirmButton: "px-4 py-2 text-sm font-medium rounded-md",
      cancelButton: "px-4 py-2 text-sm font-medium rounded-md",
    },
  });
  return result.isConfirmed;
}

/**
 * Custom styled SweetAlert2 confirmation dialog for Edit action
 */
export async function confirmEdit(title = "Confirm Edit", text = "Do you want to edit this record?") {
  const result = await Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#1d62d1",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, edit",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    customClass: {
      popup: "rounded-lg shadow-xl border border-gray-200",
      confirmButton: "px-4 py-2 text-sm font-medium rounded-md",
      cancelButton: "px-4 py-2 text-sm font-medium rounded-md",
    },
  });
  return result.isConfirmed;
}

/**
 * Custom styled SweetAlert2 confirmation dialog for Print action
 */
export async function confirmPrint(title = "Confirm Print", text = "Do you want to print this document?") {
  const result = await Swal.fire({
    title,
    text,
    icon: "info",
    showCancelButton: true,
    confirmButtonColor: "#10b981",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, print",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    customClass: {
      popup: "rounded-lg shadow-xl border border-gray-200",
      confirmButton: "px-4 py-2 text-sm font-medium rounded-md",
      cancelButton: "px-4 py-2 text-sm font-medium rounded-md",
    },
  });
  return result.isConfirmed;
}

/**
 * Generic action confirmation dialog
 */
export async function confirmAction({
  title = "Are you sure?",
  text = "Do you want to proceed with this action?",
  icon = "question",
  confirmText = "Yes, proceed",
  cancelText = "Cancel",
  confirmColor = "#1f73de",
} = {}) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor: confirmColor,
    cancelButtonColor: "#6c757d",
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/**
 * Success toast alert
 */
export function showSuccess(title = "Success!", text = "") {
  Swal.fire({
    icon: "success",
    title,
    text,
    timer: 2000,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
}

/**
 * Error alert modal
 */
export function showError(title = "Error!", text = "Something went wrong.") {
  Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: "#d33",
  });
}

/**
 * Notification toast
 */
export function showToast(title = "", icon = "info") {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2500,
  });
}
