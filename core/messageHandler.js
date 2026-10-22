    if (isGroup) {
      const groupData = db.getGroup(from);

      if (groupData?.privateMode && !isOwner && !isCoOwner) {
        return;
      }

      const effectiveIsAdmin = isAdmin || (groupData?.autoAdminOwners && isOwner);

      if (groupData?.adminMode && !effectiveIsAdmin && !isMod) {
        return;
      }

      if (groupData?.antilink && body && !effectiveIsAdmin && !isMod && !isCmd) {
        const handled = await checkAntilink({ sock, msg, from, sender, body, isBotAdmin, botLabel });
        if (handled) return;
      }

      if (!isCmd && body) {
        handleChatXp(sender);
      }
    }
