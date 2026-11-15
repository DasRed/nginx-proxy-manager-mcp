import {z} from 'zod';
import {assertId, assertSettingId, type NpmClient} from './npm-client.ts';

type Args = Record<string, unknown>;
type Shape = Record<string, z.ZodType>;

export interface ToolDefinition {
    description: string;
    /** Tool may remove or overwrite existing configuration. */
    destructive: boolean;
    inputSchema: Shape;
    name: string;
    /** Tool only reads data and never changes NPM state. */
    readOnly: boolean;
    run: (client: NpmClient, args: Args) => Promise<unknown>;
    title: string;
}

// ---------------------------------------------------------------------------
// Shared schema parts (mirrors backend/schema of NginxProxyManager)
// ---------------------------------------------------------------------------

const domainNames    = z.array(z.string().min(1).max(255)).min(1).max(100).describe('Domain names, e.g. ["app.example.com"]');
const certificateId  = z.number().int().min(0).describe('SSL certificate ID, 0 for none');
const advancedConfig = z.string().max(16384).describe('Custom nginx configuration');
const meta           = z.record(z.string(), z.unknown()).describe('Additional metadata object');
const scheme         = z.enum(['http', 'https']);
const port           = z.number().int().min(1).max(65535);
const id             = (description: string) => z.number().int().min(1).describe(description);

const location = z.object({
    path:            z.string().min(1).describe('Location path, e.g. "/api"'),
    forward_scheme:  scheme,
    forward_host:    z.string().min(1).max(255),
    forward_port:    port,
    forward_path:    z.string().optional(),
    advanced_config: z.string().optional(),
});

const sslFlags = {
    ssl_forced:      z.boolean().describe('Force HTTPS'),
    hsts_enabled:    z.boolean().describe('Enable HSTS'),
    hsts_subdomains: z.boolean().describe('Include subdomains in HSTS'),
    http2_support:   z.boolean().describe('Enable HTTP/2'),
};

const proxyHostFields = {
    domain_names:   domainNames,
    forward_scheme: scheme.describe('Scheme of the upstream'),
    forward_host:   z.string().min(1).max(255).describe('Upstream IP or hostname'),
    forward_port:   port.describe('Upstream port'),
    certificate_id: certificateId,
    ...sslFlags,
    block_exploits:          z.boolean().describe('Block common exploits'),
    caching_enabled:         z.boolean().describe('Cache assets'),
    allow_websocket_upgrade: z.boolean().describe('Allow websocket upgrades'),
    access_list_id:          z.number().int().min(0).describe('Access list ID, 0 for public'),
    advanced_config:         advancedConfig,
    meta,
    locations:               z.array(location).describe('Custom locations (replaces all existing locations)'),
};

const redirectionHostFields = {
    domain_names:        domainNames,
    forward_scheme:      z.enum(['auto', 'http', 'https']).describe('Scheme of the redirect target'),
    forward_http_code:   z.number().int().min(300).max(308).describe('HTTP status code, e.g. 301 or 302'),
    forward_domain_name: z.string().min(1).max(255).describe('Target domain'),
    preserve_path:       z.boolean().describe('Keep the request path'),
    certificate_id:      certificateId,
    ...sslFlags,
    block_exploits:  z.boolean().describe('Block common exploits'),
    advanced_config: advancedConfig,
    meta,
};

const streamFields = {
    incoming_port:   port.describe('Port NPM listens on'),
    forwarding_host: z.string().min(1).max(255).describe('Target IP or hostname'),
    forwarding_port: port.describe('Target port'),
    tcp_forwarding:  z.boolean().describe('Forward TCP'),
    udp_forwarding:  z.boolean().describe('Forward UDP'),
    certificate_id:  certificateId,
    meta,
};

const deadHostFields = {
    domain_names:   domainNames,
    certificate_id: certificateId,
    ...sslFlags,
    advanced_config: advancedConfig,
    meta,
};

const accessListFields = {
    name:        z.string().min(1).max(255).describe('Name of the access list'),
    satisfy_any: z.boolean().describe('Allow access if either auth or IP rules match'),
    pass_auth:   z.boolean().describe('Pass the Authorization header to the upstream'),
    items:       z.array(z.object({
        username: z.string().min(1),
        password: z.string().describe('Empty string keeps the existing password of that user'),
    })).describe('Basic auth users (replaces all existing users)'),
    clients:     z.array(z.object({
        address:   z.string().min(1).describe('IPv4/IPv6 address or CIDR, or "all"'),
        directive: z.enum(['allow', 'deny']),
    })).describe('IP rules (replaces all existing rules)'),
};

const userFields = {
    name:        z.string().min(1).max(255).describe('Full name'),
    nickname:    z.string().max(255).describe('Nickname'),
    email:       z.string().min(3).max(255).describe('Email address (login)'),
    roles:       z.array(z.enum(['admin'])).describe('Roles, ["admin"] or []'),
    is_disabled: z.boolean().describe('Disable the user'),
};

function optionalShape(shape: Shape): Shape {
    return Object.fromEntries(Object.entries(shape).map(([key, schema]) => [key, schema.optional()]));
}

function pick(args: Args, keys: string[]): Args {
    return Object.fromEntries(keys.filter((key) => args[key] !== undefined).map((key) => [key, args[key]]));
}

function requireChanges(changes: Args, label: string): Args {
    if (Object.keys(changes).length === 0) {
        throw new Error(`No fields to update for the ${label}`);
    }
    return changes;
}

function expandQuery(args: Args): Record<string, string | undefined> {
    const expand = args.expand as string[] | undefined;
    return {expand: expand && expand.length > 0 ? expand.join(',') : undefined};
}

function expandSchema(values: [string, ...string[]]) {
    return {expand: z.array(z.enum(values)).optional().describe('Related objects to include')};
}

// ---------------------------------------------------------------------------
// Host-like resources (proxy, redirection, dead hosts and streams)
// ---------------------------------------------------------------------------

interface HostResource {
    createDefaults: Args;
    expand: [string, ...string[]];
    fields: Shape;
    idName: string;
    label: string;
    labelPlural: string;
    path: string;
    plural: string;
    requiredOnCreate: string[];
    singular: string;
}

function hostResourceTools(resource: HostResource): ToolDefinition[] {
    const {singular, plural, label, labelPlural, path, idName, expand, fields} = resource;
    const fieldNames                                                           = Object.keys(fields);
    const idSchema                                                             = {[idName]: id(`ID of the ${label}`)};
    const itemPath                                                             = (args: Args) => `${path}/${assertId(args[idName] as number, idName)}`;

    const createShape: Shape = Object.fromEntries(
        Object.entries(fields).map(([key, schema]) => [key, resource.requiredOnCreate.includes(key) ? schema : schema.optional()]),
    );

    return [
        {
            name:        `list_${plural}`,
            title:       `List ${labelPlural}`,
            description: `List all ${labelPlural} configured in Nginx Proxy Manager`,
            readOnly:    true,
            destructive: false,
            inputSchema: expandSchema(expand),
            run:         async (client, args) => client.get(path, expandQuery(args)),
        },
        {
            name:        `get_${singular}`,
            title:       `Get ${label}`,
            description: `Get details of a ${label} by ID`,
            readOnly:    true,
            destructive: false,
            inputSchema: {...idSchema, ...expandSchema(expand)},
            run:         async (client, args) => client.get(itemPath(args), expandQuery(args)),
        },
        {
            name:        `create_${singular}`,
            title:       `Create ${label}`,
            description: `Create a new ${label}`,
            readOnly:    false,
            destructive: false,
            inputSchema: createShape,
            run:         async (client, args) => client.post(path, {...resource.createDefaults, ...pick(args, fieldNames)}),
        },
        {
            name:        `update_${singular}`,
            title:       `Update ${label}`,
            description: `Update an existing ${label}. Only the given fields are changed.`,
            readOnly:    false,
            destructive: true,
            inputSchema: {...idSchema, ...optionalShape(fields)},
            run:         async (client, args) => client.put(itemPath(args), requireChanges(pick(args, fieldNames), label)),
        },
        {
            name:        `delete_${singular}`,
            title:       `Delete ${label}`,
            description: `Delete a ${label} by ID`,
            readOnly:    false,
            destructive: true,
            inputSchema: idSchema,
            run:         async (client, args) => {
                await client.delete(itemPath(args));
                return {success: true, message: `${label} deleted`};
            },
        },
        {
            name:        `enable_${singular}`,
            title:       `Enable ${label}`,
            description: `Enable a ${label}`,
            readOnly:    false,
            destructive: false,
            inputSchema: idSchema,
            run:         async (client, args) => {
                await client.post(`${itemPath(args)}/enable`);
                return {success: true, message: `${label} enabled`};
            },
        },
        {
            name:        `disable_${singular}`,
            title:       `Disable ${label}`,
            description: `Disable a ${label}`,
            readOnly:    false,
            destructive: true,
            inputSchema: idSchema,
            run:         async (client, args) => {
                await client.post(`${itemPath(args)}/disable`);
                return {success: true, message: `${label} disabled`};
            },
        },
    ];
}

// ---------------------------------------------------------------------------
// Tool catalogue
// ---------------------------------------------------------------------------

const proxyHostTools = hostResourceTools({
    singular:         'proxy_host',
    plural:           'proxy_hosts',
    label:            'proxy host',
    labelPlural:      'proxy hosts',
    path:             '/nginx/proxy-hosts',
    idName:           'host_id',
    expand:           ['access_list', 'owner', 'certificate'],
    fields:           proxyHostFields,
    requiredOnCreate: ['domain_names', 'forward_host', 'forward_port'],
    createDefaults:   {forward_scheme: 'http'},
});

const redirectionHostTools = hostResourceTools({
    singular:         'redirection_host',
    plural:           'redirection_hosts',
    label:            'redirection host',
    labelPlural:      'redirection hosts',
    path:             '/nginx/redirection-hosts',
    idName:           'host_id',
    expand:           ['owner', 'certificate'],
    fields:           redirectionHostFields,
    requiredOnCreate: ['domain_names', 'forward_http_code', 'forward_domain_name'],
    createDefaults:   {forward_scheme: 'auto'},
});

const streamTools = hostResourceTools({
    singular:         'stream',
    plural:           'streams',
    label:            'TCP/UDP stream',
    labelPlural:      'TCP/UDP streams',
    path:             '/nginx/streams',
    idName:           'stream_id',
    expand:           ['owner', 'certificate'],
    fields:           streamFields,
    requiredOnCreate: ['incoming_port', 'forwarding_host', 'forwarding_port'],
    createDefaults:   {tcp_forwarding: true},
});

const deadHostTools = hostResourceTools({
    singular:         'dead_host',
    plural:           'dead_hosts',
    label:            '404 dead host',
    labelPlural:      '404 dead hosts',
    path:             '/nginx/dead-hosts',
    idName:           'host_id',
    expand:           ['owner', 'certificate'],
    fields:           deadHostFields,
    requiredOnCreate: ['domain_names'],
    createDefaults:   {},
});

const certificateIdSchema = {certificate_id: id('ID of the certificate')};
const certificatePath     = (args: Args) => `/nginx/certificates/${assertId(args.certificate_id as number, 'certificate_id')}`;

const certificateTools: ToolDefinition[] = [
    {
        name:        'list_certificates',
        title:       'List certificates',
        description: 'List all SSL certificates including their expiry date (expires_on)',
        readOnly:    true,
        destructive: false,
        inputSchema: expandSchema(['owner']),
        run:         async (client, args) => client.get('/nginx/certificates', expandQuery(args)),
    },
    {
        name:        'get_certificate',
        title:       'Get certificate',
        description: 'Get details of an SSL certificate by ID',
        readOnly:    true,
        destructive: false,
        inputSchema: {...certificateIdSchema, ...expandSchema(['owner'])},
        run:         async (client, args) => client.get(certificatePath(args), expandQuery(args)),
    },
    {
        name:        'request_certificate',
        title:       'Request certificate',
        description: 'Request a new Let\'s Encrypt certificate (HTTP-01 by default, DNS-01 with dns_challenge)',
        readOnly:    false,
        destructive: false,
        inputSchema: {
            domain_names:             domainNames,
            nice_name:                z.string().max(255).optional().describe('Friendly name'),
            key_type:                 z.enum(['rsa', 'ecdsa']).optional().describe('Key type'),
            dns_challenge:            z.boolean().optional().describe('Use a DNS-01 challenge'),
            dns_provider:             z.string().optional().describe('DNS provider ID, see list_dns_providers'),
            dns_provider_credentials: z.string().optional().describe('Credentials file content for the DNS provider'),
            propagation_seconds:      z.number().int().min(0).optional().describe('Seconds to wait for DNS propagation'),
        },
        run:         async (client, args) => client.post('/nginx/certificates', {
            provider: 'letsencrypt',
            ...pick(args, ['domain_names', 'nice_name']),
            meta: pick(args, ['key_type', 'dns_challenge', 'dns_provider', 'dns_provider_credentials', 'propagation_seconds']),
        }),
    },
    {
        name:        'delete_certificate',
        title:       'Delete certificate',
        description: 'Delete an SSL certificate by ID',
        readOnly:    false,
        destructive: true,
        inputSchema: certificateIdSchema,
        run:         async (client, args) => {
            await client.delete(certificatePath(args));
            return {success: true, message: 'certificate deleted'};
        },
    },
    {
        name:        'renew_certificate',
        title:       'Renew certificate',
        description: 'Renew a Let\'s Encrypt certificate now',
        readOnly:    false,
        destructive: false,
        inputSchema: certificateIdSchema,
        run:         async (client, args) => client.post(`${certificatePath(args)}/renew`),
    },
    {
        name:        'list_dns_providers',
        title:       'List DNS providers',
        description: 'List DNS providers supported for DNS-01 challenges',
        readOnly:    true,
        destructive: false,
        inputSchema: {},
        run:         async (client) => client.get('/nginx/certificates/dns-providers'),
    },
    {
        name:        'test_http_challenge',
        title:       'Test HTTP challenge',
        description: 'Check whether domains are reachable for a Let\'s Encrypt HTTP-01 challenge (changes nothing)',
        readOnly:    true,
        destructive: false,
        inputSchema: {domains: domainNames},
        run:         async (client, args) => client.post('/nginx/certificates/test-http', {domains: args.domains}),
    },
];

const accessListIdSchema = {access_list_id: id('ID of the access list')};
const accessListPath     = (args: Args) => `/nginx/access-lists/${assertId(args.access_list_id as number, 'access_list_id')}`;
const accessListExpand   = expandSchema(['owner', 'items', 'clients', 'proxy_hosts']);

const accessListTools: ToolDefinition[] = [
    {
        name:        'list_access_lists',
        title:       'List access lists',
        description: 'List all access lists (basic auth users and IP rules)',
        readOnly:    true,
        destructive: false,
        inputSchema: accessListExpand,
        run:         async (client, args) => client.get('/nginx/access-lists', expandQuery(args)),
    },
    {
        name:        'get_access_list',
        title:       'Get access list',
        description: 'Get an access list by ID',
        readOnly:    true,
        destructive: false,
        inputSchema: {...accessListIdSchema, ...accessListExpand},
        run:         async (client, args) => client.get(accessListPath(args), expandQuery(args)),
    },
    {
        name:        'create_access_list',
        title:       'Create access list',
        description: 'Create a new access list',
        readOnly:    false,
        destructive: false,
        inputSchema: {...optionalShape(accessListFields), name: accessListFields.name},
        run:         async (client, args) => client.post('/nginx/access-lists', pick(args, Object.keys(accessListFields))),
    },
    {
        name:        'update_access_list',
        title:       'Update access list',
        description: 'Update an access list. Only the given fields are changed; items and clients replace the existing entries.',
        readOnly:    false,
        destructive: true,
        inputSchema: {...accessListIdSchema, ...optionalShape(accessListFields)},
        run:         async (client, args) => client.put(accessListPath(args), requireChanges(pick(args, Object.keys(accessListFields)), 'access list')),
    },
    {
        name:        'delete_access_list',
        title:       'Delete access list',
        description: 'Delete an access list by ID',
        readOnly:    false,
        destructive: true,
        inputSchema: accessListIdSchema,
        run:         async (client, args) => {
            await client.delete(accessListPath(args));
            return {success: true, message: 'access list deleted'};
        },
    },
];

const userIdSchema = {user_id: id('ID of the user')};
const userPath     = (args: Args) => `/users/${assertId(args.user_id as number, 'user_id')}`;
const userExpand   = expandSchema(['permissions']);

const userTools: ToolDefinition[] = [
    {
        name:        'list_users',
        title:       'List users',
        description: 'List all NPM users',
        readOnly:    true,
        destructive: false,
        inputSchema: userExpand,
        run:         async (client, args) => client.get('/users', expandQuery(args)),
    },
    {
        name:        'get_user',
        title:       'Get user',
        description: 'Get an NPM user by ID',
        readOnly:    true,
        destructive: false,
        inputSchema: {...userIdSchema, ...userExpand},
        run:         async (client, args) => client.get(userPath(args), expandQuery(args)),
    },
    {
        name:        'create_user',
        title:       'Create user',
        description: 'Create a new NPM user (password and permissions are set in the NPM UI)',
        readOnly:    false,
        destructive: false,
        inputSchema: {...optionalShape(userFields), name: userFields.name, email: userFields.email},
        run:         async (client, args) => client.post('/users', {nickname: '', ...pick(args, Object.keys(userFields))}),
    },
    {
        name:        'update_user',
        title:       'Update user',
        description: 'Update an NPM user. Only the given fields are changed.',
        readOnly:    false,
        destructive: true,
        inputSchema: {...userIdSchema, ...optionalShape(userFields)},
        run:         async (client, args) => client.put(userPath(args), requireChanges(pick(args, Object.keys(userFields)), 'user')),
    },
    {
        name:        'delete_user',
        title:       'Delete user',
        description: 'Delete an NPM user by ID',
        readOnly:    false,
        destructive: true,
        inputSchema: userIdSchema,
        run:         async (client, args) => {
            await client.delete(userPath(args));
            return {success: true, message: 'user deleted'};
        },
    },
];

const settingIdSchema = {setting_id: z.string().regex(/^[a-z0-9-]{1,64}$/).describe('Setting ID, e.g. "default-site"')};
const settingPath     = (args: Args) => `/settings/${assertSettingId(args.setting_id as string)}`;

const settingTools: ToolDefinition[] = [
    {
        name:        'list_settings',
        title:       'List settings',
        description: 'List all NPM settings',
        readOnly:    true,
        destructive: false,
        inputSchema: {},
        run:         async (client) => client.get('/settings'),
    },
    {
        name:        'get_setting',
        title:       'Get setting',
        description: 'Get an NPM setting by ID',
        readOnly:    true,
        destructive: false,
        inputSchema: settingIdSchema,
        run:         async (client, args) => client.get(settingPath(args)),
    },
    {
        name:        'update_setting',
        title:       'Update setting',
        description: 'Update an NPM setting, e.g. the behaviour of the default site',
        readOnly:    false,
        destructive: true,
        inputSchema: {
            ...settingIdSchema,
            value: z.enum(['congratulations', '404', '444', 'redirect', 'html']).optional().describe('Default site behaviour'),
            meta:  z.object({
                redirect: z.string().optional().describe('Redirect target for value "redirect"'),
                html:     z.string().optional().describe('HTML content for value "html"'),
            }).optional(),
        },
        run:         async (client, args) => client.put(settingPath(args), requireChanges(pick(args, ['value', 'meta']), 'setting')),
    },
];

const reportTools: ToolDefinition[] = [
    {
        name:        'list_audit_log',
        title:       'List audit log',
        description: 'List recent audit log entries (who changed what)',
        readOnly:    true,
        destructive: false,
        inputSchema: {},
        run:         async (client) => client.get('/audit-log'),
    },
    {
        name:        'get_host_report',
        title:       'Host report',
        description: 'Get the number of proxy, redirection, stream and dead hosts',
        readOnly:    true,
        destructive: false,
        inputSchema: {},
        run:         async (client) => client.get('/reports/hosts'),
    },
];

export const TOOLS: ToolDefinition[] = [
    ...proxyHostTools,
    ...redirectionHostTools,
    ...streamTools,
    ...deadHostTools,
    ...certificateTools,
    ...accessListTools,
    ...userTools,
    ...settingTools,
    ...reportTools,
];
