// Fallback usado cuando sock.profilePictureUrl() falla (usuario/grupo sin foto).
// Se usa como { image: { url: defaultAvatar() } }, por eso devuelve un string URL
// que siempre responde 200 (avatar genérico de Gravatar, "mystery person").
export default function defaultAvatar() {
  return "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y&s=500";
}
