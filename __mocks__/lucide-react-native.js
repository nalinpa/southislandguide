// lucide-react-native ships ESM that jest-expo doesn't transform, and every import of it is
// a decorative icon. A root __mocks__ entry for a node_modules package is applied
// automatically, so no test file needs to repeat this.
module.exports = new Proxy({}, { get: () => () => null });
