import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AlbumT } from "@/schemas";

interface PinnedAlbumState {
  pinned_album: AlbumT | null;
}

const initialState: PinnedAlbumState = {
  pinned_album: null,
};

const pinnedAlbumSlice = createSlice({
  name: "pinnedAlbum",
  initialState,
  reducers: {
    setPinnedAlbum: (state, action: PayloadAction<AlbumT | null>) => {
      state.pinned_album = action.payload;
    },
    clearPinnedAlbum: (state) => {
      state.pinned_album = null;
    },
  },
});

export const { setPinnedAlbum, clearPinnedAlbum } = pinnedAlbumSlice.actions;
export default pinnedAlbumSlice.reducer;

