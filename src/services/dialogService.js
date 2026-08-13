let dialogHandler = null;
let isPresenting = false;
const pendingDialogs = [];

const dispatchNext = () => {
  if (!dialogHandler || isPresenting || pendingDialogs.length === 0) return;
  isPresenting = true;
  dialogHandler(pendingDialogs.shift());
};

export const subscribeToDialogs = (handler) => {
  dialogHandler = handler;
  dispatchNext();
  return () => {
    if (dialogHandler === handler) dialogHandler = null;
  };
};

const enqueueDialog = (dialog) => new Promise((resolve) => {
  pendingDialogs.push({ ...dialog, resolve });
  dispatchNext();
});

export const showAlert = (message, options = {}) => enqueueDialog({
  kind: 'alert',
  message: String(message ?? ''),
  ...options,
});

export const showConfirm = (message, options = {}) => enqueueDialog({
  kind: 'confirm',
  message: String(message ?? ''),
  ...options,
});

export const notifyDialogClosed = () => {
  isPresenting = false;
  dispatchNext();
};
