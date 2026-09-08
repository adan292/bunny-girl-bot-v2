/**
 * Distintos forks de Baileys exportan (o no) un tipo `WASocket` con nombres
 * ligeramente distintos. En vez de pelear con eso cada vez que se cambia
 * de fork, centralizamos aquí el tipo del socket. Se sacrifica algo de
 * chequeo estricto de tipos a cambio de no romper el build cada vez que
 * se cambia de paquete de Baileys.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WASocket = any;
