const queryConvert = function (parameterizedSql, args) {
    const [text, values] = Object.entries(args).reduce(
        ([sql, array, index], [key, value]) => [
            sql.replace(new RegExp(`:${ key }`, 'gi'), `$${ index }`),
            [...array, value],
            index + 1
        ],
        [parameterizedSql, [], 1]
    )

    return { text, values }
}

module.exports = {
    queryConvert
}
