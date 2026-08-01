// ایشو #21: RBAC پایه — نقش‌های 'physician' و 'admin' در فاز اول.
// فرض: authenticate middleware قبلاً req.user را ست کرده است.
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'دسترسی کافی برای این عملیات ندارید' });
    }
    next();
  };
}

/**
 * قاعدهٔ چندمستأجری: یک پزشک فقط به داده‌های clinic خودش دسترسی دارد،
 * مگر نقش admin که در فاز اول هم‌چنان محدود به clinic خودش است
 * (RBAC چندکلینیکی سراسری خارج از scope فاز اول است).
 */
export function scopedToOwnClinic(req, resourceClinicId) {
  return req.user?.clinicId === resourceClinicId;
}
