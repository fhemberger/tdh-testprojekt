'use strict';

const Fs     = require('fs');
const Path   = require('path');
const Hapi   = require('hapi');
const server = new Hapi.Server();

server.connection({ port: 8080 });

const internals = {};

// Pfade und Einstellungen für die HTML-Seiten
// Siehe: https://github.com/hapijs/vision
internals.viewConfig = {
    engines      : { html: require('handlebars') },
    path         : Path.join(__dirname, 'html'),
    helpersPath  : Path.join(__dirname, 'helpers'),
    partialsPath : Path.join(__dirname, 'module')
};

// Plug-ins laden
internals.plugins = [
    // Kümmert sich um das Ausliefern der statischen Dateien
    { register: require('inert') },
    // Kümmert sich ums Rendering des HTMLs
    { register: require('vision') }
];


server.register(internals.plugins)
    .then(() => {

        server.views(internals.viewConfig);

        server.route([
            // Alle Dateien, deren Pfade mit '/static/' beginnen, werden im gleichnamigen Ordner gesucht
            {
                method  : 'GET',
                path    : '/static/{param*}',
                handler : { directory: { path: Path.join(__dirname, '/static') } }
            },

            // Leere Antwort für favicon zurückgeben, weil sonst 404-Meldungen nerven
            {
                method  : 'GET',
                path    : '/favicon.ico',
                handler : function (request, reply) {
                    return reply();
                }
            },

            // Alle anderen Pfade werden als Seitenname interpretiert und als Handlebars-Template gerendert
            {
                method  : 'GET',
                path    : '/{path*}',
                handler : function (request, reply) {

                    // Lese den Pfad und Dateinamen aus der URL aus
                    let htmlFile = request.params.path || '';

                    // Ersetze "" oder abschließendes "/" durch 'index'
                    htmlFile = htmlFile.replace(/^(?:(.*\/)$|$)/, '$1index.html');

                    // Prüfe, ob die Datei existiert, und gebe ggf. Fehlermeldung aus
                    let fullPath = Path.join(__dirname, 'html', htmlFile);
                    if (Path.extname(fullPath) !== '.html') {
                        fullPath = fullPath + '.html';
                    }

                    try {
                        Fs.statSync(fullPath);
                    } catch (_) {
                        return reply({
                            statusCode : 404,
                            error      : 'Not Found',
                            message    : `File '${fullPath}' could not be found`
                        }).code(404);
                    }

                    // Rendere die HTML-Seite aus dem Ordner 'html' mit dem Namen (ohne Dateiendung)
                    return reply.view(htmlFile.replace(/\.html$/, ''));
                }
            }
        ]);

        return Promise.resolve();
    })
    .then(() => server.start())
    .then(() => console.log(`Server running at: \x1B[1;4m${server.info.uri}\x1B[0m`))
    .catch((err) => console.error(err.message));
