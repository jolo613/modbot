class EntryFile {
    /**
     * The internal ID for this file
     * @type {number}
     */
    id;

    /**
     * The local path on the file, if a locally-stored file.
     * @type {string}
     */
    local_path;

    /**
     * The remote path of the file. The link of the URL, where the file was downloaded from, or the name the file was uploaded to Discord under.
     * @type {string}
     */
    remote_path;

    /**
     * Files: The generated name for this file. Links: The remote path of this file
     * @type {string} 
     */
    name;

    /**
     * User-set label of the file.
     * @type {string}
     */
    label;

    /**
     * Content-Type received when the request was sent to the link
     * @type {string}
     */
    content_type;

    constructor(id, local_path, remote_path, name, label, content_type) {
        this.id = id;
        this.local_path = local_path;
        this.remote_path = remote_path;
        this.name = name;
        this.label = label;
        this.content_type = content_type;
    }
}

module.exports = EntryFile;