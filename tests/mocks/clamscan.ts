export default class NodeClam {
  async init() {
    return {
      scanStream: async () => ({ isInfected: false, viruses: [] }),
    };
  }
}
