import numpy as np


class CircularBuffer:
    def __init__(self, shape: tuple, dtype):
        self.array = np.zeros(shape, dtype)
        self.pos = 0
        self.length = shape[0]
        self.shape = shape

    def write(self, data):
        size = len(data)
        end = self.pos + size

        if end <= self.length:
            self.array[self.pos:self.pos + size] = data
        else:
            split = self.length - self.pos
            self.array[self.pos:] = data[:split]
            self.array[:size - split] = data[split:]

        self.pos = (self.pos + size) % self.length

    def read(self, frames: int = None):
        if frames is None:
            frames = self.length - 1

        start = (self.pos - frames) % self.length

        if start <= self.pos:
            return self.array[start:self.pos]
        else:
            return np.concatenate([
                self.array[start:],
                self.array[:self.pos]
            ])

    def slice(self, start: int = 0, end: int = 0, step=None):
        start = (self.pos + start) % self.length
        end = (self.pos + end) % self.length

        if start <= end:
            return self.array[start:end:step]
        else:
            return np.concatenate([
                self.array[start::step],
                self.array[:end:step]
            ])
