module.exports = async (req, res) => {
  const { common } = req.context;
  const { modelId } = req.body;

  if(!modelId) {
    const message = 'modelId property required';

    console.error(message);
    res.status(400).end(message);

    return;
  }

  try {
    await common.models.deleteModel({ modelId });

    res.status(200).end(`${modelId} successfully deleted`);
  } catch (err) {
    console.error(err);
    res.status(500).end(err.message);
  }
};
