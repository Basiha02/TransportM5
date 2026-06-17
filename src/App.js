1. После const saveTimer = useRef(null); добавьте:


const pendingSave = useRef(false);
2. Замените функцию upd:


const upd = fn => {
  pendingSave.current = true;
  setData(prev => {
    const d = JSON.parse(JSON.stringify(prev));
    fn(d);
    dataRef.current = d;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveData(dataRef.current);
      pendingSave.current = false;
    }, 600);
    return d;
  });
};
3. Замените периодический refresh:


useEffect(() => {
  const id = setInterval(() => {
    if (!pendingSave.current) {
      loadData().then(d => { if (d) setData(d); });
    }
  }, 5000);
  return () => clearInterval(id);
}, []);
