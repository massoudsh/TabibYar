// Express 4 rejections را از async handlerها به error middleware منتقل نمی‌کند.
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
