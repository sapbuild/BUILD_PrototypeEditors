'use strict';
module.exports = {
    dev: {
        expand: true,
        cwd: 'client',
        src: ['**/*.svg'],
        dest: 'dev',
        // Target options
        options: {
            mode: {
                css: {
                    sprite: 'norman-prototype-editors-client.svg',
                    bust: false,
                    render: {
                        less: {
                            dest: 'sprite'
                        }
                    },
                    dimensions: true,
                    dest: 'resources/norman-prototype-editors-client',
                    prefix: '.prototype-'
                }
            },
            dest: 'dev',
            shape: {
                spacing: {
                    padding: 1,
                    box: 'content'
                }
            },
            svg: {
                dest: 'resources/norman-prototype-editors-client'
            }
        }
    }
};
