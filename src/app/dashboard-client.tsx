  }, [dataReady, preferences.widgets]);

  function navigate(id: string) {
    const routes: Record<string, string> = {
      "study-room": "/hoc-chung",
      forum: "/dien-dan",
      messages: "/tin-nhan",
      leaderboard: "/xep-hang",
    };
    const route = routes[id];
    if (route) {
      const room = data?.room;
      const scene = room?.scenes.find((item) => item.id === room.selectedId);
      if (scene && room) {
        const detail = { scene, loop: room.loop, muted: room.youtubeMuted };
        try { localStorage.setItem(PERSISTENT_YOUTUBE_KEY, JSON.stringify(detail)); } catch {}
        window.dispatchEvent(new CustomEvent("stillroom-youtube-handoff", { detail }));
      }
      router.push(route);
      return;
    }
    if (id === "profile") {
      if (data?.account?.id) { window.location.href = "/nguoi-dung/" + encodeURIComponent(data.account.id); }
      else { setActiveNav("profile"); notice("Đăng nhập Google để mở trang cá nhân.", true); }
      return;
    }
    setActiveNav(id);