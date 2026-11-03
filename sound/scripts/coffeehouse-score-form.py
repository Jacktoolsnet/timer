"""Deterministic symbolic MIDI assembly for the Schumann AABB performance.

The helper encodes one pass of 8 + 14 bars. The historical score prints both
repeat signs. Copy the complete four voices, never a melody-only approximation.
No timing/human performance or external audio is imported.
"""
import struct


def vlq(value):
    result = [value & 127]
    while value >> 7:
        value >>= 7
        result.insert(0, (value & 127) | 128)
    return bytes(result)


def schumann_performance(score):
    assert score['end'] == 44 and score['meters'] == [(0., 2, 4)]
    assert len(score['tracks']) == 4
    tracks = []
    for track in score['tracks']:
        notes = []
        for start, stop, destination in [(0, 16, 0), (0, 16, 16), (16, 44, 32), (16, 44, 60)]:
            for at, duration, pitch, velocity in track['notes']:
                if start <= at < stop:
                    assert at + duration <= stop + 1e-8, 'A repeat must not cut a tied note'
                    notes.append((at - start + destination, duration, pitch, velocity))
        tracks.append(dict(name=track['name'], notes=sorted(notes)))
    return dict(tracks=tracks, end=88., meters=[(0., 2, 4)])


def midi_bytes(score):
    ppq = 3072  # Exact thirds, sixteenths and dotted values.
    chunks = []
    for index, track in enumerate(score['tracks']):
        name = track['name'].encode('utf-8')
        prefix = b'\x00\xff\x03' + vlq(len(name)) + name
        if index == 0:
            prefix += b'\x00\xff\x58\x04\x02\x02\x18\x08'
            prefix += b'\x00\xff\x51\x03' + round(60000000 / 72).to_bytes(3, 'big')
        events = []
        for at, duration, pitch, velocity in track['notes']:
            events.append((round(at * ppq), 1, bytes([0x90 + index, pitch, velocity])))
            events.append((round((at + duration) * ppq), 0, bytes([0x80 + index, pitch, 0])))
        data = bytearray(prefix)
        previous = 0
        for tick, _, event in sorted(events):
            data += vlq(tick - previous) + event
            previous = tick
        data += vlq(round(score['end'] * ppq) - previous) + b'\xff\x2f\x00'
        chunks.append(b'MTrk' + struct.pack('>I', len(data)) + data)
    return b'MThd' + struct.pack('>IHHH', 6, 1, len(chunks), ppq) + b''.join(chunks)
