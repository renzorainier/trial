export const mappingTable = {
    _: "_", G: "A", Z: "B", R: "C", L: "D", V: "E", N: "F", H: "G", Q: "H", J: "I", P: "J", W: "K",
    S: "L", B: "M", T: "N", U: "O", M: "P", K: "Q", F: "R", X: "S", A: "T", O: "U", E: "V",
    Y: "W", D: "X", C: "Y", I: "Z", h: "a", q: "b", e: "c", k: "d", r: "e", v: "f", y: "g",
    b: "h", j: "i", z: "j", m: "k", o: "l", u: "m", s: "n", g: "o", x: "p", l: "q", p: "r",
    f: "s", d: "t", n: "u", t: "v", a: "w", c: "x", w: "y", i: "z", 5: "0", 8: "1", 3: "2",
    7: "3", 1: "4", 9: "5", 0: "6", 4: "7", 2: "8", 6: "9"
  };


export const getPhilippineTime = () => {
  const now = new Date();
  const options = { timeZone: 'Asia/Manila', hour12: false };
  const dateStr = now.toLocaleDateString('sv-SE', options);
  const timeStr = now.toLocaleTimeString('it-IT', options);
  const dateTimeStr = `${dateStr}T${timeStr}`;
  return dateTimeStr;
};
