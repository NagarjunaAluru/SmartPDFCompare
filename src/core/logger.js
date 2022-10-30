let logLevel = 0;

const setLogLevel = (value) => { logLevel = value }

const log = async (data, maxLevel) => {
    if (maxLevel === undefined || maxLevel <= logLevel) {
        if (typeof data === 'string') {
            await console.log(data);
        } else {
            await console.dir(data, { depth: null });
        }
    }
};

module.exports = {
    setLogLevel,
    log,
};