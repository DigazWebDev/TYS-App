export function formatRelativeTime(isoDate: string) {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) {
    return '';
  }

  const delta = Math.max(0, Date.now() - then);
  const minutes = Math.floor(delta / 60000);

  if (minutes < 1) {
    return 'agora';
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} d`;
  }

  return new Date(isoDate).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
  });
}
