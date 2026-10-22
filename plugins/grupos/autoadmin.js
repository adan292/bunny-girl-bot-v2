export default {
  name: ["autoadmin"],
  description: "Comando deshabilitado",
  category: "grupos",
  ownerOnly: true,
  async run({ reply }) {
    await reply({
      text: "❌ Este comando está deshabilitado. El repo quedó restaurado al estado original."
    });
  }
};
