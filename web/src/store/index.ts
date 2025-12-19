import { configureStore } from "@reduxjs/toolkit";
import pinnedAlbumReducer from "./pinnedAlbumSlice";

export const store = configureStore({
  reducer: {
    pinnedAlbum: pinnedAlbumReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

