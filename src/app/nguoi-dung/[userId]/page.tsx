"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/app/icons";
import { ProfileAvatarMenu } from "@/app/components/profile-avatar-menu";

type ProfileData = {
  profile: {
    id: string; name: string; email: string | null; picture: string | null; coverPicture: string | null;
    bio: string | null; createdAt: string; lastSignInAt: string; isAdmin: boolean;
  };
  relationship: "self" | "friend" | "incoming" | "outgoing" | "blocked" | "none";
  relationshipRequestId: number | null;
  blockStatus: "none" | "blocked_by_me" | "blocked_you";
  stats: { friendCount: number; forumPostCount: number; photoPostCount: number; focusMinutes: number };
  friends: { id: string; name: string; picture: string | null; bio: string | null }[];
  forumPosts: { id: number; title: string; body: string; meetRoomId: number | null; pinned: boolean; createdAt: string }[];
  profilePosts: { id: number; body: string | null; imageData: string | null; createdAt: string }[];
};

const MAX_IMAGE_LENGTH = 1000000;

function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return minutes + " phút";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " giờ";
  const days = Math.floor(hours / 24);
  if (days < 30) return days + " ngày";
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function initials(name: string) {
  return name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U";
}

function avatar(name: string, picture: string | null, className = "") {
  return <span className={"profile-avatar " + className}>{picture ? <img src={picture} alt="" /> : initials(name)}</span>;
}

function compressImage(file: File, maxWidth: number, maxHeight: number, quality: number) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Hãy chọn một file ảnh."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được ảnh."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Ảnh không hợp lệ."));
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Trình duyệt không hỗ trợ xử lý ảnh."));
        ctx.drawImage(img, 0, 0, width, height);
        const result = canvas.toDataURL("image/webp", quality);
        if (result.length > MAX_IMAGE_LENGTH) return reject(new Error("Ảnh vẫn quá lớn. Hãy chọn ảnh khác."));
        resolve(result);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params.userId;
  const [data, setData] = useState<ProfileData | null>(null);
  const [tab, setTab] = useState<"activity" | "photos" | "friends">("activity");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [blockStatus, setBlockStatus] = useState<"none" | "blocked_by_me" | "blocked_you">("none");
  const [bio, setBio] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [coverData, setCoverData] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [postImage, setPostImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const postInput = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/users/" + encodeURIComponent(userId), { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as Partial<ProfileData> & { error?: string };
      if (!response.ok || !payload.profile) throw new Error(payload.error || "Không tải được trang cá nhân.");
      const full = payload as ProfileData;
      setData(full);
      setBio(full.profile.bio || "");
      setAvatarData(null);
      setCoverData(null);
      if (full.relationship !== "self") {
        const blockResponse = await fetch("/api/blocks?userId=" + encodeURIComponent(full.profile.id), { cache: "no-store", credentials: "same-origin" });
        if (blockResponse.ok) setBlockStatus((await blockResponse.json() as { status: "none" | "blocked_by_me" | "blocked_you" }).status);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được trang cá nhân.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [userId]);

  async function sendFriendRequest() {
    if (!data) return;
    try {
      const response = await fetch("/api/friends", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.profile.id }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể gửi lời mời.");
      setNotice("Đã gửi lời mời kết bạn.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể gửi lời mời.");
    }
  }

  async function removeFriend() {
    if (!data || data.relationship !== "friend") return;
    if (!confirm("Hủy kết bạn với " + data.profile.name + "?")) return;
    try {
      const response = await fetch("/api/friends/" + encodeURIComponent(data.profile.id), {
        method: "DELETE", credentials: "same-origin",
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể hủy kết bạn.");
      await load();
      setNotice("Đã hủy kết bạn.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể hủy kết bạn.");
    }
  }

  async function cancelFriendRequest() {
    if (!data?.relationshipRequestId || data.relationship !== "outgoing") return;
    try {
      const response = await fetch("/api/friends/requests/" + data.relationshipRequestId, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể hủy lời mời.");
      await load();
      setNotice("Đã hủy lời mời kết bạn.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể hủy lời mời.");
    }
  }

  async function unfriend() {
    if (!data || data.relationship !== "friend") return;
    if (!window.confirm("Hủy kết bạn với tài khoản này?")) return;
    try {
      const response = await fetch("/api/friends?userId=" + encodeURIComponent(data.profile.id), { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể hủy kết bạn.");
      await load();
      setNotice("Đã hủy kết bạn.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể hủy kết bạn.");
    }
  }

  async function respondToFriend(action: "accept" | "reject") {
    if (!data?.relationshipRequestId) return;
    try {
      const response = await fetch("/api/friends/requests/" + data.relationshipRequestId, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể xử lý lời mời.");
      await load();
      setNotice(action === "accept" ? "Đã trở thành bạn bè." : "Đã từ chối lời mời.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể xử lý lời mời.");
    }
  }

  async function toggleBlock() {
    if (!data || data.relationship === "self") return;
    const method = data.blockStatus === "blocked_by_me" ? "DELETE" : "POST";
    setBlocking(true);
    try {
      setBlocking(true);
      const response = await fetch("/api/blocks", {
        method, credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.profile.id }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; status?: ProfileData["blockStatus"] };
      if (!response.ok) throw new Error(payload.error || "Không thể cập nhật chặn.");
      await load();
      setNotice(method === "POST" ? "Đã chặn tài khoản này." : "Đã bỏ chặn.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể cập nhật chặn.");
    } finally {
      setBlocking(false);
    }
  }

  async function saveProfile() {
    if (!data) return;
    setSavingProfile(true);
    try {
      const body: Record<string, unknown> = { bio };
      if (avatarData !== null) body.customPicture = avatarData;
      if (coverData !== null) body.coverPicture = coverData;
      const response = await fetch("/api/users/" + encodeURIComponent(data.profile.id), {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể lưu hồ sơ.");
      setEditMode(false);
      setAvatarData(null);
      setCoverData(null);
      setNotice("Đã cập nhật trang cá nhân.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể lưu hồ sơ.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function chooseAvatar(file: File | undefined) {
    if (!file) return;
    try {
      setAvatarData(await compressImage(file, 600, 600, .84));
      setEditMode(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể chọn ảnh.");
    }
  }

  async function chooseCover(file: File | undefined) {
    if (!file) return;
    try {
      setCoverData(await compressImage(file, 1500, 520, .8));
      setEditMode(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể chọn ảnh.");
    }
  }

  async function choosePostImage(file: File | undefined) {
    if (!file) return;
    try {
      setPostImage(await compressImage(file, 1400, 1100, .8));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể chọn ảnh.");
    }
  }

  async function publishPost() {
    if (!postBody.trim() && !postImage) return;
    setPosting(true);
    try {
      const response = await fetch("/api/profile/posts", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: postBody.trim(), imageData: postImage }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể đăng bài.");
      setPostBody("");
      setPostImage(null);
      if (postInput.current) postInput.current.value = "";
      setNotice("Đã đăng lên trang cá nhân.");
      setTab("photos");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể đăng bài.");
    } finally {
      setPosting(false);
    }
  }

  async function deletePhotoPost(id: number) {
    if (!confirm("Xóa bài đăng này?")) return;
    try {
      const response = await fetch("/api/profile/posts?id=" + id, { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể xóa.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể xóa.");
    }
  }

  const displayPicture = avatarData ?? data?.profile.picture ?? null;
  const displayCover = coverData ?? data?.profile.coverPicture ?? null;
  const activity = useMemo(() => {
    const photos = (data?.profilePosts ?? []).map(post => ({ kind: "photo" as const, date: post.createdAt, post }));
    const forum = (data?.forumPosts ?? []).map(post => ({ kind: "forum" as const, date: post.createdAt, post }));
    return [...photos, ...forum].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  if (loading) return <main className="profile-loading"><span className="profile-loader" />Đang mở trang cá nhân…</main>;
  if (!data) return <main className="profile-loading"><strong>Không tìm thấy tài khoản.</strong><button className="button-primary" type="button" onClick={() => router.push("/dien-dan")}>Về diễn đàn</button></main>;

  const isSelf = data.relationship === "self";

  return <main className="profile-page">
    {notice && <div className="community-alert profile-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}

    <div className="profile-top-actions">
      <button type="button" className="profile-back-btn" onClick={() => router.back()}><Icon name="arrow" size={13} /> Quay lại</button>
      <button type="button" className="profile-share-btn" onClick={() => { void navigator.clipboard?.writeText(window.location.href); setNotice("Đã sao chép liên kết trang cá nhân."); }}><Icon name="arrow" size={13} /> Chia sẻ hồ sơ</button>
    </div>

    <section className="profile-cover">
      {displayCover ? <img src={displayCover} alt="" /> : <div className="profile-cover-placeholder"><span>STILL / ROOM</span></div>}
      {isSelf && <button className="profile-cover-edit" type="button" onClick={() => coverInput.current?.click()}><Icon name="sliders" size={14} /> Ảnh bìa</button>}
      <input ref={coverInput} hidden type="file" accept="image/*" onChange={e => void chooseCover(e.target.files?.[0])} />
    </section>

    <section className="profile-identity">
      <button className="profile-avatar-wrap" type="button" onClick={() => isSelf && avatarInput.current?.click()} aria-label="Đổi ảnh đại diện">
        {avatar(data.profile.name, displayPicture, "xl")}
        {isSelf && <span className="avatar-edit-dot"><Icon name="sliders" size={12} /></span>}
      </button>
      <input ref={avatarInput} hidden type="file" accept="image/*" onChange={e => void chooseAvatar(e.target.files?.[0])} />
      <div className="profile-main-info">
        <div className="profile-name-row"><h1>{data.profile.name}</h1>{data.profile.isAdmin && <span className="profile-role">ADMIN</span>}</div>
        <p className="profile-bio">{data.profile.bio || "Chưa thêm phần giới thiệu."}</p>
        <div className="profile-meta-line">
          <span><Icon name="clock" size={13} /> Thành viên từ {new Date(data.profile.createdAt).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })}</span>
          {data.profile.email && <span><Icon name="signal" size={13} /> {data.profile.email}</span>}
        </div>
      </div>
      <div className="profile-actions">
        {isSelf ? <button className="button-primary" type="button" onClick={() => setEditMode(current => !current)}><Icon name="sliders" size={14} /> {editMode ? "Đang chỉnh sửa" : "Chỉnh hồ sơ"}</button>
        : data.relationship === "blocked" ? <span className="profile-blocked-label">Đã chặn / bị chặn</span>
        : data.relationship === "friend" ? <div className="profile-action-group"><button className="button-primary" type="button" onClick={() => router.push("/tin-nhan/" + encodeURIComponent(data.profile.id))}><Icon name="arrow" size={14} /> Nhắn tin</button><button className="button-secondary" type="button" onClick={() => void removeFriend()}>Hủy kết bạn</button></div>
        : data.relationship === "incoming" ? <div className="profile-action-group"><button className="button-primary" type="button" onClick={() => void respondToFriend("accept")}>Chấp nhận</button><button className="button-secondary" type="button" onClick={() => void respondToFriend("reject")}>Từ chối</button></div>
        : data.relationship === "outgoing" ? <button className="button-secondary" type="button" onClick={() => void cancelFriendRequest()}>Hủy lời mời</button>
        : <button className="button-primary" type="button" onClick={() => void sendFriendRequest()}>Kết bạn</button>}
        {}
        {!isSelf && <button className="profile-block-btn" type="button" onClick={() => void toggleBlock()} disabled={blocking}>{data.relationship === "blocked" ? "Bỏ chặn" : "Chặn"}</button>}
      </div>
    </section>

    <section className="profile-stats">
      <div><strong>{data.stats.friendCount}</strong><span>Bạn bè</span></div>
      <div><strong>{data.stats.forumPostCount}</strong><span>Bài diễn đàn</span></div>
      <div><strong>{data.stats.photoPostCount}</strong><span>Bài cá nhân</span></div>
      <div><strong>{Math.floor(data.stats.focusMinutes / 60)}h {data.stats.focusMinutes % 60}m</strong><span>Đã tập trung</span></div>
    </section>

    {isSelf && editMode && <section className="profile-edit-panel">
      <div className="profile-edit-head"><div><span className="small-label">CHỈNH HỒ SƠ</span><h3>Thông tin của bạn</h3></div><span>{bio.length}/280</span></div>
      <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={280} placeholder="Một câu ngắn về bạn, mục tiêu học tập hoặc điều bạn đang theo đuổi…" />
      <div className="profile-edit-actions">
        <button type="button" className="button-secondary" onClick={() => avatarInput.current?.click()}>Đổi ảnh đại diện</button>
        <button type="button" className="button-secondary" onClick={() => coverInput.current?.click()}>Đổi ảnh bìa</button>
        <button type="button" className="button-primary" disabled={savingProfile} onClick={() => void saveProfile()}>{savingProfile ? "Đang lưu…" : "Lưu thay đổi"}</button>
      </div>
    </section>}

    {isSelf && <section className="profile-composer">
      <div className="profile-composer-head">{avatar(data.profile.name, displayPicture, "small")}<div><strong>Đăng lên trang cá nhân</strong><span>Chia sẻ một khoảnh khắc học tập, ảnh bàn học hoặc điều bạn muốn lưu lại.</span></div></div>
      <textarea value={postBody} onChange={e => setPostBody(e.target.value)} maxLength={2000} placeholder="Bạn đang nghĩ gì?" />
      {postImage && <div className="profile-post-preview"><img src={postImage} alt="Ảnh xem trước" /><button type="button" onClick={() => setPostImage(null)}><Icon name="close" size={14} /></button></div>}
      <div className="profile-composer-footer">
        <button type="button" className="button-secondary" onClick={() => postInput.current?.click()}><Icon name="book" size={14} /> Thêm ảnh</button>
        <input ref={postInput} hidden type="file" accept="image/*" onChange={e => void choosePostImage(e.target.files?.[0])} />
        <button type="button" className="button-primary" disabled={posting || (!postBody.trim() && !postImage)} onClick={() => void publishPost()}>{posting ? "Đang đăng…" : "Đăng bài"}</button>
      </div>
    </section>}

    <nav className="profile-tabs" aria-label="Nội dung trang cá nhân">
      <button className={tab === "activity" ? "active" : ""} type="button" onClick={() => setTab("activity")}>Hoạt động</button>
      <button className={tab === "photos" ? "active" : ""} type="button" onClick={() => setTab("photos")}>Bài cá nhân <span>{data.profilePosts.length}</span></button>
      <button className={tab === "friends" ? "active" : ""} type="button" onClick={() => setTab("friends")}>Bạn bè <span>{data.friends.length}</span></button>
    </nav>

    {tab === "friends"
      ? <section className="profile-friends-grid">
          {data.friends.length === 0 ? <div className="profile-empty">Chưa có bạn bè công khai.</div> :
            data.friends.map(friend => <div key={friend.id} className="profile-friend-card">
              <ProfileAvatarMenu id={friend.id} name={friend.name} picture={friend.picture} size="normal" />
              <button type="button" className="profile-friend-info" onClick={() => router.push("/nguoi-dung/" + friend.id)}><span><strong>{friend.name}</strong><small>{friend.bio || "Thành viên still.room"}</small></span><Icon name="arrow" size={14} /></button>
            </div>)}
        </section>
      : tab === "photos"
      ? <section className="profile-feed">
          {data.profilePosts.length === 0 ? <div className="profile-empty">Chưa có bài đăng cá nhân.</div> :
            data.profilePosts.map(post => <article className="profile-post-card" key={post.id}>
              <div className="profile-post-top">{avatar(data.profile.name, displayPicture, "small")}<div><strong>{data.profile.name}</strong><span>{timeLabel(post.createdAt)}</span></div>{isSelf && <button type="button" className="profile-delete-btn" onClick={() => void deletePhotoPost(post.id)}><Icon name="close" size={14} /></button>}</div>
              {post.body && <p>{post.body}</p>}
              {post.imageData && <img className="profile-post-image" src={post.imageData} alt="" />}
            </article>)}
        </section>
      : <section className="profile-activity-grid">
          <div className="profile-activity-main">
            {activity.length === 0 ? <div className="profile-empty">Chưa có hoạt động để hiển thị.</div> :
              activity.map(item => item.kind === "photo"
                ? <article className="profile-post-card" key={"photo-" + item.post.id}>
                    <div className="profile-post-top">{avatar(data.profile.name, displayPicture, "small")}<div><strong>{data.profile.name}</strong><span>{timeLabel(item.post.createdAt)}</span></div></div>
                    {item.post.body && <p>{item.post.body}</p>}
                    {item.post.imageData && <img className="profile-post-image" src={item.post.imageData} alt="" />}
                  </article>
                : <article className="profile-forum-card" key={"forum-" + item.post.id}>
                    <div className="profile-forum-kicker"><Icon name="book" size={13} /> {item.post.pinned ? "Được ghim" : "Bài diễn đàn"} · {timeLabel(item.post.createdAt)}</div>
                    <h3>{item.post.title}</h3><p>{item.post.body}</p>
                    <button type="button" onClick={() => router.push("/dien-dan")}><Icon name="arrow" size={13} /> Mở diễn đàn</button>
                  </article>)}
          </div>
          <aside className="profile-side">
            <section className="profile-side-card"><span className="small-label">VỀ BẠN</span><h3>{data.profile.bio || "Một người đang học tại still.room."}</h3><div className="profile-side-metric"><strong>{Math.floor(data.stats.focusMinutes / 60)}h</strong><span>tập trung tích lũy</span></div></section>
            <section className="profile-side-card"><div className="profile-side-head"><span className="small-label">BẠN BÈ</span><button type="button" onClick={() => setTab("friends")}>Xem tất cả</button></div><div className="profile-mini-friends">{data.friends.slice(0, 6).map(friend => <ProfileAvatarMenu key={friend.id} id={friend.id} name={friend.name} picture={friend.picture} size="tiny" />)}</div></section>
          </aside>
        </section>}
  </main>;
}
